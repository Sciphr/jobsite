-- Migration: Add category, tags, and usage tracking fields to EmailTemplate
-- Execute these commands in order

-- 1. Add new columns to email_templates table
ALTER TABLE email_templates 
ADD COLUMN category VARCHAR(50),
ADD COLUMN tags TEXT[],
ADD COLUMN usage_count INTEGER DEFAULT 0,
ADD COLUMN last_used_at TIMESTAMP;

-- 2. Create index for better query performance
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_usage_count ON email_templates(usage_count);

-- 3. Update existing templates with proper categories based on their type
UPDATE email_templates 
SET category = 'application' 
WHERE type IN ('application_received', 'application_under_review');

UPDATE email_templates 
SET category = 'interview' 
WHERE type IN ('interview_invitation', 'interview_reminder', 'interview_feedback');

UPDATE email_templates 
SET category = 'onboarding' 
WHERE type IN ('onboarding_welcome', 'offer_extended', 'offer_accepted');

UPDATE email_templates 
SET category = 'rejection' 
WHERE type IN ('rejection_general', 'rejection_interview', 'offer_declined');

UPDATE email_templates 
SET category = 'general' 
WHERE type IN ('document_request', 'custom');

UPDATE email_templates 
SET category = 'follow_up' 
WHERE type = 'follow_up';

-- 4. Set default category for any remaining templates
UPDATE email_templates 
SET category = 'general' 
WHERE category IS NULL;

-- 5. Add some sample tags based on template types
UPDATE email_templates 
SET tags = ARRAY['automated', 'candidate-communication']
WHERE type IN ('application_received', 'application_under_review');

UPDATE email_templates 
SET tags = ARRAY['interview', 'scheduling']
WHERE type IN ('interview_invitation', 'interview_reminder');

UPDATE email_templates 
SET tags = ARRAY['interview', 'feedback']
WHERE type = 'interview_feedback';

UPDATE email_templates 
SET tags = ARRAY['offer', 'onboarding']
WHERE type IN ('offer_extended', 'onboarding_welcome');

UPDATE email_templates 
SET tags = ARRAY['offer', 'response']
WHERE type IN ('offer_accepted', 'offer_declined');

UPDATE email_templates 
SET tags = ARRAY['rejection', 'communication']
WHERE type IN ('rejection_general', 'rejection_interview');

UPDATE email_templates 
SET tags = ARRAY['documents', 'requirements']
WHERE type = 'document_request';

UPDATE email_templates 
SET tags = ARRAY['follow-up', 'communication']
WHERE type = 'follow_up';

UPDATE email_templates 
SET tags = ARRAY['custom', 'general']
WHERE type = 'custom' OR tags IS NULL;

-- 6. Update usage_count based on existing email records (if emails table tracks template usage)
UPDATE email_templates 
SET usage_count = (
    SELECT COUNT(*) 
    FROM emails 
    WHERE emails.template_id = email_templates.id
),
last_used_at = (
    SELECT MAX(sent_at) 
    FROM emails 
    WHERE emails.template_id = email_templates.id
);

-- 7. Set default usage_count to 0 for templates that haven't been used
UPDATE email_templates 
SET usage_count = 0 
WHERE usage_count IS NULL;

-- 8. Make category field NOT NULL after setting all values
ALTER TABLE email_templates 
ALTER COLUMN category SET NOT NULL;

-- 9. Add constraint to ensure category is one of the valid values
ALTER TABLE email_templates 
ADD CONSTRAINT check_category 
CHECK (category IN ('application', 'interview', 'onboarding', 'rejection', 'general', 'follow_up'));

COMMENT ON COLUMN email_templates.category IS 'Template category for organization and filtering';
COMMENT ON COLUMN email_templates.tags IS 'Array of tags for flexible categorization';
COMMENT ON COLUMN email_templates.usage_count IS 'Number of times this template has been used';
COMMENT ON COLUMN email_templates.last_used_at IS 'Timestamp of when this template was last used';