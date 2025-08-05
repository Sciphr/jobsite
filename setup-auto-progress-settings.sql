-- setup-auto-progress-settings.sql
-- Add auto-progress delay days setting for applications

-- Insert the auto_progress_delay_days setting if it doesn't exist
INSERT INTO settings (
  key,
  value,
  category,
  "userId",
  "privilegeLevel",
  "dataType",
  description,
  "createdAt",
  "updatedAt"
) VALUES (
  'auto_progress_delay_days',
  '3',  -- Default to 3 days
  'hiring_workflow',
  NULL,  -- System setting (not user-specific)
  2,     -- Admin level required
  'number',
  'Days to wait before auto-progressing applications from Applied to Reviewing (0 to disable)',
  NOW(),
  NOW()
) ON CONFLICT (key, "userId") DO NOTHING;

-- Verify the setting was added
SELECT key, value, category, "dataType", description 
FROM settings 
WHERE key = 'auto_progress_delay_days';