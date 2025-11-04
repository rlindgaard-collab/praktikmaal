/*
  # Fix Infinite Recursion in Supervisor Policies

  1. Problem
    - "Supervisors can read all profiles" policy checks user_profiles to see if user is supervisor
    - This creates infinite recursion when querying user_profiles
    - Same issue affects goals table supervisor policy

  2. Solution
    - Check supervisor_sessions directly in policies instead of user_profiles
    - Remove circular dependency by not referencing user_profiles in its own policy
    - Keep is_supervisor column for app logic but not for RLS

  3. Security
    - All policies maintained with same security level
    - Direct session check is more secure and avoids recursion
*/

-- Drop problematic policies
DROP POLICY IF EXISTS "Supervisors can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Supervisors can view all goals" ON goals;

-- Create supervisor policy for user_profiles that checks sessions directly
CREATE POLICY "Supervisors can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM supervisor_sessions
      WHERE user_id = (select auth.uid())
      AND expires_at > now()
    )
  );

-- Create supervisor policy for goals that checks sessions directly
CREATE POLICY "Supervisors can view all goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM supervisor_sessions
      WHERE user_id = (select auth.uid())
      AND expires_at > now()
    )
  );

-- Update is_supervisor function to check sessions directly
DROP FUNCTION IF EXISTS is_supervisor();
CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM supervisor_sessions
    WHERE user_id = auth.uid()
    AND expires_at > now()
  );
$$;