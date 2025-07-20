-- Simple Template Database Update
-- Run this SQL command in your PostgreSQL database

-- Add new fields to email_templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;

-- Update existing templates with categories
UPDATE email_templates SET category = 'application' WHERE type IN ('application_received', 'application_under_review');
UPDATE email_templates SET category = 'interview' WHERE type IN ('interview_invitation', 'interview_reminder', 'interview_feedback');
UPDATE email_templates SET category = 'onboarding' WHERE type IN ('onboarding_welcome', 'offer_extended', 'offer_accepted');
UPDATE email_templates SET category = 'rejection' WHERE type IN ('rejection_general', 'rejection_interview', 'offer_declined');
UPDATE email_templates SET category = 'general' WHERE type IN ('document_request', 'custom');
UPDATE email_templates SET category = 'follow_up' WHERE type = 'follow_up';
UPDATE email_templates SET category = 'general' WHERE category IS NULL;

-- Add helpful tags
UPDATE email_templates SET tags = ARRAY['automated', 'candidate-communication'] WHERE type IN ('application_received', 'application_under_review');
UPDATE email_templates SET tags = ARRAY['interview', 'scheduling'] WHERE type IN ('interview_invitation', 'interview_reminder');
UPDATE email_templates SET tags = ARRAY['interview', 'feedback'] WHERE type = 'interview_feedback';
UPDATE email_templates SET tags = ARRAY['offer', 'onboarding'] WHERE type IN ('offer_extended', 'onboarding_welcome');
UPDATE email_templates SET tags = ARRAY['offer', 'response'] WHERE type IN ('offer_accepted', 'offer_declined');
UPDATE email_templates SET tags = ARRAY['rejection', 'communication'] WHERE type IN ('rejection_general', 'rejection_interview');
UPDATE email_templates SET tags = ARRAY['documents', 'requirements'] WHERE type = 'document_request';
UPDATE email_templates SET tags = ARRAY['follow-up', 'communication'] WHERE type = 'follow_up';
UPDATE email_templates SET tags = ARRAY['custom', 'general'] WHERE type = 'custom' OR tags IS NULL;

-- Update usage counts from existing email records
UPDATE email_templates 
SET usage_count = COALESCE((
    SELECT COUNT(*) 
    FROM emails 
    WHERE emails.template_id = email_templates.id
), 0),
last_used_at = (
    SELECT MAX(sent_at) 
    FROM emails 
    WHERE emails.template_id = email_templates.id
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_usage_count ON email_templates(usage_count);

-- Make category required after setting all values
ALTER TABLE email_templates ALTER COLUMN category SET NOT NULL;