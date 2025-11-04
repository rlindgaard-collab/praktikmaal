/*
  # Add CASCADE delete for user deletion

  1. Changes
    - Drop existing foreign key constraint on goals table
    - Add new foreign key constraint with CASCADE delete
    - This ensures when a user is deleted from auth.users, all their goals are automatically deleted

  2. Security
    - No changes to RLS policies needed
    - Maintains data integrity by preventing orphaned goals
*/

-- Drop the existing foreign key constraint
ALTER TABLE goals 
DROP CONSTRAINT IF EXISTS goals_user_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE goals
ADD CONSTRAINT goals_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;