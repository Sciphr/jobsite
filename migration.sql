-- Add rate limiting fields to users table
ALTER TABLE users 
ADD COLUMN max_daily_notifications INTEGER DEFAULT 5,
ADD COLUMN notification_batch_minutes INTEGER DEFAULT 30,
ADD COLUMN last_notification_sent_at TIMESTAMP(6);

-- Create notification_logs table
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    job_id UUID NOT NULL,
    subscription_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP(6) DEFAULT NOW(),
    batch_id UUID,
    
    CONSTRAINT fk_notification_logs_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_logs_job_id 
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_logs_subscription_id 
        FOREIGN KEY (subscription_id) REFERENCES job_alert_subscriptions(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX idx_notification_logs_batch_id ON notification_logs(batch_id);

-- Add relation field to job_alert_subscriptions (this is just for Prisma, no SQL needed)
-- The notification_logs table already references job_alert_subscriptions via subscription_id
