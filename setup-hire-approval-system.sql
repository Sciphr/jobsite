-- Setup Hire Approval System
-- Run this SQL to add the hire approval functionality to your database

BEGIN;

-- 1. Create hire_approval_requests table
CREATE TABLE IF NOT EXISTS hire_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    requested_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP(6),
    previous_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_hire_approval_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_hire_approval_requested_by FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_hire_approval_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT chk_hire_approval_status CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- Ensure only one pending request per application
    CONSTRAINT unique_pending_hire_request UNIQUE (application_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hire_approval_requests_application_id ON hire_approval_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_hire_approval_requests_requested_by ON hire_approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_hire_approval_requests_reviewed_by ON hire_approval_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_hire_approval_requests_status ON hire_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_hire_approval_requests_requested_at ON hire_approval_requests(requested_at);

-- 2. Add the approve_hire permission
INSERT INTO permissions (id, resource, action, description, category, is_system_permission, created_at)
VALUES (
    gen_random_uuid(),
    'applications',
    'approve_hire',
    'Approve hiring decisions for applications',
    'hiring',
    true,
    NOW()
) ON CONFLICT (resource, action) DO NOTHING;

-- 3. Update the require_approval_for_hire setting if it doesn't exist
INSERT INTO settings (id, key, value, category, "userId", "privilegeLevel", "dataType", description, "createdAt", "updatedAt")
VALUES (
    '545c0ed4-1efa-41ae-b1ac-e09cf05f95eb',
    'require_approval_for_hire',
    'false',
    'hiring_pipeline',
    NULL,
    0,
    'boolean',
    'Require manager approval before marking applications as hired',
    NOW(),
    NOW()
) ON CONFLICT (key, "userId") DO NOTHING;

-- 4. Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_hire_approval_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hire_approval_updated_at
    BEFORE UPDATE ON hire_approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_hire_approval_updated_at();

-- 5. Add some helpful views for reporting (optional)
CREATE OR REPLACE VIEW hire_approval_summary AS
SELECT 
    har.id,
    har.application_id,
    har.status,
    har.requested_at,
    har.reviewed_at,
    har.previous_status,
    a.name as applicant_name,
    a.email as applicant_email,
    j.title as job_title,
    j.department as job_department,
    u_req.email as requested_by_email,
    u_req."firstName" || ' ' || u_req."lastName" as requested_by_name,
    u_rev.email as reviewed_by_email,
    u_rev."firstName" || ' ' || u_rev."lastName" as reviewed_by_name
FROM hire_approval_requests har
LEFT JOIN applications a ON har.application_id = a.id
LEFT JOIN jobs j ON a."jobId" = j.id
LEFT JOIN users u_req ON har.requested_by = u_req.id
LEFT JOIN users u_rev ON har.reviewed_by = u_rev.id;

COMMIT;

-- Verification queries to run after setup:
-- SELECT COUNT(*) as hire_approval_requests_count FROM hire_approval_requests;
-- SELECT * FROM permissions WHERE action = 'approve_hire';
-- SELECT * FROM settings WHERE key = 'require_approval_for_hire';
-- SELECT * FROM hire_approval_summary LIMIT 5;

-- Example: Grant approve_hire permission to a specific role
-- INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
-- SELECT 
--     r.id as role_id,
--     p.id as permission_id,
--     NULL as granted_by,
--     NOW() as granted_at
-- FROM roles r, permissions p 
-- WHERE r.name = 'HR Manager' 
--   AND p.resource = 'applications' 
--   AND p.action = 'approve_hire'
-- ON CONFLICT (role_id, permission_id) DO NOTHING;