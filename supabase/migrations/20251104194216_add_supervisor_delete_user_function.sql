/*
  # Add supervisor delete user function

  1. New Function
    - `delete_user_as_supervisor` - Allows supervisors to delete users
    - Takes user_id as parameter
    - Verifies caller has supervisor session
    - Deletes the specified user from auth.users
    - Goals are automatically deleted via CASCADE constraint

  2. Security
    - Function uses security definer to run with elevated privileges
    - Only callable by authenticated users with valid supervisor session
    - Validates supervisor status before deletion
*/

-- Create function to delete user as supervisor
CREATE OR REPLACE FUNCTION delete_user_as_supervisor(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_supervisor boolean;
BEGIN
  -- Check if the current user has a supervisor session
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_supervisor = true
  ) INTO is_supervisor;

  -- If not a supervisor, deny the request
  IF NOT is_supervisor THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  -- Delete the user from auth.users (goals will be deleted automatically via CASCADE)
  DELETE FROM auth.users WHERE id = target_user_id;

  -- Return success
  RETURN json_build_object('success', true);
END;
$$;