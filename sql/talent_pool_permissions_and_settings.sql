-- ============================================================================
-- Talent Pool Permissions and Settings Setup
-- ============================================================================
-- This script adds:
-- 1. Talent pool permissions (read, invite, source, note)
-- 2. Company domains system setting
-- 3. Assigns talent pool permissions to admin roles
-- ============================================================================

-- ============================================================================
-- PART 1: Add Talent Pool Permissions
-- ============================================================================

-- Add talent_pool permissions
INSERT INTO permissions (resource, action, description, category, is_system_permission)
VALUES
  ('talent_pool', 'read', 'View and search talent pool candidates', 'Talent Pool', true),
  ('talent_pool', 'invite', 'Send job invitations to candidates', 'Talent Pool', true),
  ('talent_pool', 'source', 'Add candidates directly to job pipelines', 'Talent Pool', true),
  ('talent_pool', 'note', 'Add notes and track interactions with candidates', 'Talent Pool', true)
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================================================
-- PART 2: Assign Talent Pool Permissions to Roles
-- ============================================================================

-- Get role IDs for assignment
DO $$
DECLARE
  super_admin_role_id UUID;
  admin_role_id UUID;
  hr_role_id UUID;
  talent_pool_read_perm_id UUID;
  talent_pool_invite_perm_id UUID;
  talent_pool_source_perm_id UUID;
  talent_pool_note_perm_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin' LIMIT 1;
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;
  SELECT id INTO hr_role_id FROM roles WHERE name = 'hr' LIMIT 1;

  -- Get permission IDs
  SELECT id INTO talent_pool_read_perm_id FROM permissions WHERE resource = 'talent_pool' AND action = 'read';
  SELECT id INTO talent_pool_invite_perm_id FROM permissions WHERE resource = 'talent_pool' AND action = 'invite';
  SELECT id INTO talent_pool_source_perm_id FROM permissions WHERE resource = 'talent_pool' AND action = 'source';
  SELECT id INTO talent_pool_note_perm_id FROM permissions WHERE resource = 'talent_pool' AND action = 'note';

  -- Assign to Super Admin (all permissions)
  IF super_admin_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES
      (super_admin_role_id, talent_pool_read_perm_id),
      (super_admin_role_id, talent_pool_invite_perm_id),
      (super_admin_role_id, talent_pool_source_perm_id),
      (super_admin_role_id, talent_pool_note_perm_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Assign to Admin (all permissions)
  IF admin_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES
      (admin_role_id, talent_pool_read_perm_id),
      (admin_role_id, talent_pool_invite_perm_id),
      (admin_role_id, talent_pool_source_perm_id),
      (admin_role_id, talent_pool_note_perm_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Assign to HR (all permissions)
  IF hr_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES
      (hr_role_id, talent_pool_read_perm_id),
      (hr_role_id, talent_pool_invite_perm_id),
      (hr_role_id, talent_pool_source_perm_id),
      (hr_role_id, talent_pool_note_perm_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Talent pool permissions assigned to roles successfully';
END $$;

-- ============================================================================
-- PART 3: Add Company Domains System Setting
-- ============================================================================

-- Add company_domains setting
-- This is a comma-separated list of email domains that identify internal users
-- Example: "company.com,subsidiary.com"
INSERT INTO settings (key, value, category, privilege_level, data_type, description, "userId")
VALUES (
  'company_domains',
  '',  -- Empty by default - admin should configure this
  'hiring_integrations',
  2,  -- Admin level
  'string',
  'Comma-separated list of company email domains for identifying internal candidates (e.g., "company.com,subsidiary.com"). Users with these email domains will be considered internal candidates and can view internal-only jobs.',
  NULL  -- System-level setting
)
ON CONFLICT (key, "userId")
DO UPDATE SET
  category = EXCLUDED.category,
  privilege_level = EXCLUDED.privilege_level,
  data_type = EXCLUDED.data_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- PART 4: Verification Queries
-- ============================================================================

-- Verify permissions were created
SELECT
  resource,
  action,
  description,
  category
FROM permissions
WHERE resource = 'talent_pool'
ORDER BY action;

-- Verify role assignments
SELECT
  r.name as role_name,
  p.resource,
  p.action,
  p.description
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.resource = 'talent_pool'
ORDER BY r.name, p.action;

-- Verify company_domains setting
SELECT
  key,
  value,
  category,
  description,
  data_type
FROM settings
WHERE key = 'company_domains';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Talent Pool Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added:';
  RAISE NOTICE '  ✓ 4 talent_pool permissions';
  RAISE NOTICE '  ✓ Assigned to admin roles';
  RAISE NOTICE '  ✓ company_domains system setting';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Configure company_domains in Admin > Settings';
  RAISE NOTICE '  2. Add email domains (e.g., "company.com")';
  RAISE NOTICE '  3. Navigate to /admin/talent-pool to start using it!';
  RAISE NOTICE '========================================';
END $$;
