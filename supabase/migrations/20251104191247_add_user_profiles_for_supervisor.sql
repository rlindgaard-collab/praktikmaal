/*
  # Add User Profiles Table for Supervisor Access

  1. New Tables
    - `user_profiles`
      - `user_id` (uuid, primary key, references auth.users)
      - `email` (text) - Copy of user email for easy access
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes
    - Create function to auto-create profile on user signup
    - Create trigger to populate profile data
    - Allow supervisors to read all user profiles
  
  3. Security
    - Enable RLS on user_profiles
    - Users can read their own profile
    - Supervisors can read all profiles
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow supervisors to read all profiles
CREATE POLICY "Supervisors can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_supervisor());

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO UPDATE
  SET email = NEW.email,
      updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO user_profiles (user_id, email)
SELECT id, email FROM auth.users
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    updated_at = now();
