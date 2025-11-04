/*
  # Optimize RLS Policies and Fix Security Issues

  1. Changes
    - Optimize all RLS policies by wrapping auth.uid() in SELECT subqueries
    - Fix function search path for is_supervisor
    - Add is_supervisor column to user_profiles for performance
    - Drop unused goals_created_at_idx index
    - Update trigger to set is_supervisor flag

  2. Performance Improvements
    - Using (select auth.uid()) prevents re-evaluation for each row
    - Direct column check for supervisor status is faster than function call

  3. Security
    - All existing RLS policies maintained
    - Function search path fixed for security
*/

-- Drop and recreate RLS policies for goals table with optimized auth.uid()
DROP POLICY IF EXISTS "Users can read own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
DROP POLICY IF EXISTS "Supervisors can view all goals" ON goals;

CREATE POLICY "Users can read own goals"
  ON goals FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Add is_supervisor column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_supervisor boolean DEFAULT false;

-- Update existing supervisor sessions to mark profiles
UPDATE user_profiles
SET is_supervisor = true
WHERE user_id IN (
  SELECT user_id FROM supervisor_sessions WHERE expires_at > now()
);

-- Create optimized supervisor policy for goals using direct column check
CREATE POLICY "Supervisors can view all goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = (select auth.uid())
      AND is_supervisor = true
    )
  );

-- Drop and recreate RLS policies for supervisor_sessions with optimized auth.uid()
DROP POLICY IF EXISTS "Users can view own supervisor session" ON supervisor_sessions;
DROP POLICY IF EXISTS "Users can create own supervisor session" ON supervisor_sessions;
DROP POLICY IF EXISTS "Users can delete own supervisor session" ON supervisor_sessions;

CREATE POLICY "Users can view own supervisor session"
  ON supervisor_sessions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own supervisor session"
  ON supervisor_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own supervisor session"
  ON supervisor_sessions
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate RLS policies for user_profiles with optimized auth.uid()
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Supervisors can read all profiles" ON user_profiles;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Supervisors can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = (select auth.uid())
      AND up.is_supervisor = true
    )
  );

-- Fix is_supervisor function with proper search path
DROP FUNCTION IF EXISTS is_supervisor();
CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_supervisor = true
  );
$$;

-- Drop unused index
DROP INDEX IF EXISTS goals_created_at_idx;

-- Update handle_new_user function to ensure search path is set
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, is_supervisor)
  VALUES (NEW.id, NEW.email, false)
  ON CONFLICT (user_id) DO UPDATE
  SET email = NEW.email,
      updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger function to mark user as supervisor when session is created
CREATE OR REPLACE FUNCTION mark_user_as_supervisor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profiles
  SET is_supervisor = true
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create trigger for supervisor session creation
DROP TRIGGER IF EXISTS on_supervisor_session_created ON supervisor_sessions;
CREATE TRIGGER on_supervisor_session_created
  AFTER INSERT ON supervisor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION mark_user_as_supervisor();

-- Create trigger function to unmark user as supervisor when all sessions expire
CREATE OR REPLACE FUNCTION unmark_user_as_supervisor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has any active supervisor sessions
  IF NOT EXISTS (
    SELECT 1 FROM supervisor_sessions
    WHERE user_id = OLD.user_id
    AND expires_at > now()
  ) THEN
    UPDATE user_profiles
    SET is_supervisor = false
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$;

-- Create trigger for supervisor session deletion
DROP TRIGGER IF EXISTS on_supervisor_session_deleted ON supervisor_sessions;
CREATE TRIGGER on_supervisor_session_deleted
  AFTER DELETE ON supervisor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION unmark_user_as_supervisor();