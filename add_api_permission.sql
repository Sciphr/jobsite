-- Add API management permission
-- Run this SQL script in your PostgreSQL database

INSERT INTO permissions (resource, action, description, category) 
VALUES ('api', 'manage', 'Manage API keys and access', 'System')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant this permission to existing super admin roles (optional)
-- You may want to adjust this based on your existing role structure
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Super Admin' 
  AND p.resource = 'api' 
  AND p.action = 'manage'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );