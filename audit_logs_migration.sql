-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event Classification
    event_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    
    -- Entity Information
    entity_type VARCHAR(50),
    entity_id UUID,
    entity_name VARCHAR(255),
    
    -- Actor Information
    actor_id UUID,
    actor_type VARCHAR(20) DEFAULT 'user' NOT NULL,
    actor_name VARCHAR(255),
    
    -- Action Details
    action VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Change Tracking
    old_values JSONB,
    new_values JSONB,
    changes JSONB,
    
    -- Context & Metadata
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    
    -- Relationships (for easy filtering)
    related_user_id UUID,
    related_job_id UUID,
    related_application_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP(6) DEFAULT NOW() NOT NULL,
    
    -- Severity & Status
    severity VARCHAR(20) DEFAULT 'info' NOT NULL,
    status VARCHAR(20) DEFAULT 'success' NOT NULL,
    
    -- Additional Context
    tags TEXT[] DEFAULT '{}' NOT NULL,
    metadata JSONB
);

-- Add foreign key constraints
ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_actor 
FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_related_user 
FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_related_job 
FOREIGN KEY (related_job_id) REFERENCES jobs(id) ON DELETE SET NULL;

ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_related_application 
FOREIGN KEY (related_application_id) REFERENCES applications(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_related_application ON audit_logs(related_application_id);
CREATE INDEX idx_audit_logs_related_job ON audit_logs(related_job_id);
CREATE INDEX idx_audit_logs_related_user ON audit_logs(related_user_id);
CREATE INDEX idx_audit_logs_category_date ON audit_logs(category, created_at);
CREATE INDEX idx_audit_logs_entity_timeline ON audit_logs(entity_type, entity_id, created_at);

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging table for tracking all system activities';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event (CREATE, UPDATE, DELETE, LOGIN, etc.)';
COMMENT ON COLUMN audit_logs.category IS 'High-level category (USER, JOB, APPLICATION, EMAIL, etc.)';
COMMENT ON COLUMN audit_logs.subcategory IS 'Detailed subcategory for specific event types';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity being acted upon (user, job, application, etc.)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the specific entity being acted upon';
COMMENT ON COLUMN audit_logs.actor_id IS 'ID of the user/system performing the action';
COMMENT ON COLUMN audit_logs.actor_type IS 'Type of actor (user, system, api, cron, etc.)';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous state of the entity (for updates)';
COMMENT ON COLUMN audit_logs.new_values IS 'New state of the entity (for updates/creates)';
COMMENT ON COLUMN audit_logs.changes IS 'Specific fields that changed with before/after values';
COMMENT ON COLUMN audit_logs.related_user_id IS 'Related user for cross-referencing (e.g., application owner)';
COMMENT ON COLUMN audit_logs.related_job_id IS 'Related job for cross-referencing';
COMMENT ON COLUMN audit_logs.related_application_id IS 'Related application for cross-referencing';
COMMENT ON COLUMN audit_logs.severity IS 'Severity level (info, warning, error, critical)';
COMMENT ON COLUMN audit_logs.status IS 'Operation status (success, failure, partial, pending)';
COMMENT ON COLUMN audit_logs.tags IS 'Searchable tags for categorization and filtering';
COMMENT ON COLUMN audit_logs.metadata IS 'Flexible JSON field for additional context data';