-- Add Google Analytics permissions

-- 1. Add analytics view permission (may already exist)
INSERT INTO permissions (id, resource, action, description, category, is_system_permission, created_at)
VALUES (
    gen_random_uuid(),
    'analytics',
    'view',
    'View analytics data and reports',
    'analytics',
    true,
    NOW()
) ON CONFLICT (resource, action) DO NOTHING;

-- 2. Add google-analytics specific permission
INSERT INTO permissions (id, resource, action, description, category, is_system_permission, created_at)
VALUES (
    gen_random_uuid(),
    'google-analytics',
    'view',
    'View Google Analytics data and reports',
    'analytics',
    true,
    NOW()
) ON CONFLICT (resource, action) DO NOTHING;

-- 3. Grant analytics permissions to admin roles
-- First, get the admin role IDs and permission IDs, then grant permissions
-- This assumes you have roles like 'admin' or similar

-- Grant analytics view permission to roles with privilege level >= 2 (admins)
INSERT INTO role_permissions (id, role_id, permission_id, granted_by, granted_at)
SELECT 
    gen_random_uuid(),
    ur.role_id,
    p.id,
    (SELECT id FROM users WHERE "privilegeLevel" >= 3 LIMIT 1), -- Granted by super admin
    NOW()
FROM (
    SELECT DISTINCT ur.role_id 
    FROM user_roles ur
    JOIN users u ON ur.user_id = u.id 
    WHERE u."privilegeLevel" >= 2
) ur
CROSS JOIN permissions p
WHERE p.resource = 'analytics' AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant google-analytics view permission to roles with privilege level >= 2 (admins)
INSERT INTO role_permissions (id, role_id, permission_id, granted_by, granted_at)
SELECT 
    gen_random_uuid(),
    ur.role_id,
    p.id,
    (SELECT id FROM users WHERE "privilegeLevel" >= 3 LIMIT 1), -- Granted by super admin
    NOW()
FROM (
    SELECT DISTINCT ur.role_id 
    FROM user_roles ur
    JOIN users u ON ur.user_id = u.id 
    WHERE u."privilegeLevel" >= 2
) ur
CROSS JOIN permissions p
WHERE p.resource = 'google-analytics' AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;