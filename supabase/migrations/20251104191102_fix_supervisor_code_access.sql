/*
  # Fix Supervisor Code Access

  1. Changes
    - Update RLS policy to allow anonymous users to verify supervisor codes
    - This is needed so users can verify the code before authentication
  
  2. Security
    - Read-only access for verification purposes
    - Codes are static and non-sensitive for verification
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can verify supervisor codes" ON supervisor_codes;

-- Create new policy that allows both authenticated and anon users
CREATE POLICY "Anyone can verify supervisor codes"
  ON supervisor_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);
