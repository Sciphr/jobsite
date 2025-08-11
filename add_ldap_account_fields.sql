-- Add LDAP account type and metadata fields to users table
ALTER TABLE users 
ADD COLUMN account_type VARCHAR(20) DEFAULT 'local',
ADD COLUMN ldap_dn VARCHAR(500),
ADD COLUMN ldap_groups TEXT[],
ADD COLUMN ldap_synced_at TIMESTAMPTZ;

-- Add LDAP-specific fields to roles table  
ALTER TABLE roles
ADD COLUMN is_ldap_role BOOLEAN DEFAULT false,
ADD COLUMN ldap_group_name VARCHAR(200),
ADD COLUMN is_editable BOOLEAN DEFAULT true;

-- Create index for account type filtering
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_roles_ldap ON roles(is_ldap_role);

-- Update existing users to be 'local' account type (already default)
UPDATE users SET account_type = 'local' WHERE account_type IS NULL;

-- Add constraint to ensure account_type is valid
ALTER TABLE users 
ADD CONSTRAINT chk_account_type CHECK (account_type IN ('local', 'ldap'));

COMMENT ON COLUMN users.account_type IS 'Type of user account: local (created in app) or ldap (synced from LDAP)';
COMMENT ON COLUMN users.ldap_dn IS 'LDAP Distinguished Name for LDAP users';
COMMENT ON COLUMN users.ldap_groups IS 'Array of LDAP group names user belongs to';
COMMENT ON COLUMN users.ldap_synced_at IS 'Last time LDAP data was synchronized';
COMMENT ON COLUMN roles.is_ldap_role IS 'Role automatically created from LDAP group';
COMMENT ON COLUMN roles.ldap_group_name IS 'Original LDAP group name this role represents';
COMMENT ON COLUMN roles.is_editable IS 'Whether role name can be edited (false for LDAP roles)';