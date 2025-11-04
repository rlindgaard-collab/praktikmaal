/*
  # Update goals table to use percentage-based progress

  1. Changes
    - Replace `status` column (not-started/in-progress/completed) with `progress` column (0-100)
    - Migrate existing data:
      - not-started → 0%
      - in-progress → 50%
      - completed → 100%
  
  2. Notes
    - Progress values are constrained between 0 and 100
    - Default value is 0 (not started)
*/

-- Add new progress column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'progress'
  ) THEN
    ALTER TABLE goals ADD COLUMN progress integer DEFAULT 0;
  END IF;
END $$;

-- Migrate existing status data to progress
UPDATE goals
SET progress = CASE
  WHEN status = 'not-started' THEN 0
  WHEN status = 'in-progress' THEN 50
  WHEN status = 'completed' THEN 100
  ELSE 0
END
WHERE progress IS NULL OR progress = 0;

-- Add constraint to ensure progress is between 0 and 100
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'goals_progress_range'
  ) THEN
    ALTER TABLE goals ADD CONSTRAINT goals_progress_range CHECK (progress >= 0 AND progress <= 100);
  END IF;
END $$;

-- Drop old status column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'status'
  ) THEN
    ALTER TABLE goals DROP COLUMN status;
  END IF;
END $$;