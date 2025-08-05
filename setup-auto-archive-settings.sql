-- SQL script to verify auto-archive setting
-- You already have 'auto_archive_rejected_days' set to 90 days
-- No additional settings needed - scheduler runs at midnight daily

-- Verify your existing auto-archive setting
SELECT key, value, category, description, "dataType", "privilegeLevel" 
FROM settings 
WHERE key = 'auto_archive_rejected_days';