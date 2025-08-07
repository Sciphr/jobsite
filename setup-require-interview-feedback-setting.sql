-- Setup script for "Require Interview Feedback" setting
-- This setting ensures that feedback must be provided for completed interviews before status can be changed from "Interview"

-- Add the setting to the settings table
INSERT INTO settings (key, value, description, created_at, updated_at)
VALUES (
  'require_interview_feedback',
  'false',  -- Set to 'true' to enable the requirement
  'Require feedback notes after interviews - When enabled, users must provide feedback for all completed interviews before changing application status from Interview to another status',
  NOW(),
  NOW()
) ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Create index for better performance when checking interview feedback
CREATE INDEX IF NOT EXISTS idx_application_notes_interview_feedback 
ON application_notes(application_id, type) 
WHERE type = 'interview_feedback';

-- Create index for metadata queries on interview feedback
CREATE INDEX IF NOT EXISTS idx_application_notes_metadata_interview_id 
ON application_notes USING GIN(metadata) 
WHERE type = 'interview_feedback';

-- Verify the setup
SELECT 
  key,
  value,
  description
FROM settings 
WHERE key = 'require_interview_feedback';

COMMIT;