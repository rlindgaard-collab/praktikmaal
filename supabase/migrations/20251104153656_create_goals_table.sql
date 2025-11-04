/*
  # Create goals table for Praktikmål Tracker

  1. New Tables
    - `goals`
      - `id` (uuid, primary key) - Unique identifier for each goal
      - `user_id` (uuid, foreign key to auth.users) - Owner of the goal
      - `title` (text) - Goal title (max 120 characters)
      - `description` (text) - Goal description
      - `status` (text) - Current status: 'red', 'yellow', or 'green'
      - `reflection` (text) - User's reflection on the goal
      - `pdf_name` (text, nullable) - Original PDF filename
      - `pdf_data` (text, nullable) - Base64 encoded PDF data
      - `pdf_size` (integer, nullable) - PDF file size in bytes
      - `pdf_type` (text, nullable) - PDF MIME type
      - `color` (text) - Tab color for the goal (hex color code)
      - `created_at` (timestamptz) - When the goal was created
      - `updated_at` (timestamptz) - When the goal was last updated

  2. Security
    - Enable RLS on `goals` table
    - Add policy for users to read their own goals
    - Add policy for users to insert their own goals
    - Add policy for users to update their own goals
    - Add policy for users to delete their own goals

  3. Notes
    - All goals are private to the user who created them
    - PDFs are stored as base64 data URLs in the database
    - Status defaults to 'red' for new goals
    - Timestamps are automatically managed
*/

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL CHECK (char_length(title) <= 120),
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'red' CHECK (status IN ('red', 'yellow', 'green')),
  reflection text DEFAULT '',
  pdf_name text,
  pdf_data text,
  pdf_size integer,
  pdf_type text,
  color text NOT NULL DEFAULT '#66BB6A',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals(user_id);
CREATE INDEX IF NOT EXISTS goals_created_at_idx ON goals(created_at DESC);