/*
  # Add Supervisor Access System

  1. New Tables
    - `supervisor_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique) - The admin code for supervisor access
      - `created_at` (timestamptz)
  
  2. Changes
    - Add RLS policies for supervisors to view all users' goals
    - Create a default supervisor code
  
  3. Security
    - Enable RLS on `supervisor_codes` table
    - Add policy for authenticated users to verify codes
    - Add policy for supervisors to read all goals
*/

-- Create supervisor_codes table
CREATE TABLE IF NOT EXISTS supervisor_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supervisor_codes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to check if a code exists (for verification)
CREATE POLICY "Anyone can verify supervisor codes"
  ON supervisor_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert default supervisor code
INSERT INTO supervisor_codes (code)
VALUES ('vejleder2024')
ON CONFLICT (code) DO NOTHING;

-- Add policy for supervisors to view all goals
-- Note: This requires the app to set a custom claim or session variable when a supervisor logs in
-- For now, we'll create a helper function that can be called to check supervisor status

-- Create a table to track active supervisor sessions
CREATE TABLE IF NOT EXISTS supervisor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE supervisor_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to check their own supervisor session
CREATE POLICY "Users can view own supervisor session"
  ON supervisor_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to create their own supervisor session
CREATE POLICY "Users can create own supervisor session"
  ON supervisor_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own supervisor session
CREATE POLICY "Users can delete own supervisor session"
  ON supervisor_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to check if user is a supervisor
CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM supervisor_sessions
    WHERE user_id = auth.uid()
    AND expires_at > now()
  );
$$;

-- Add new policy for supervisors to view all goals
CREATE POLICY "Supervisors can view all goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (is_supervisor());
