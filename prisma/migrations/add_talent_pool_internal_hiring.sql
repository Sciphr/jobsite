-- Add visibility field to jobs table
ALTER TABLE jobs ADD COLUMN visibility VARCHAR(20) DEFAULT 'external' CHECK (visibility IN ('external', 'internal', 'both'));
CREATE INDEX idx_jobs_visibility ON jobs(visibility);
COMMENT ON COLUMN jobs.visibility IS 'Job visibility: external (public), internal (authenticated company users only), or both';

-- Add company_domain to settings (for internal candidate identification)
-- This will be set in system settings, e.g., "sciphr.ca,mycompany.com"

-- Add sourced applications tracking
ALTER TABLE applications ADD COLUMN source_type VARCHAR(20) DEFAULT 'applied' CHECK (source_type IN ('applied', 'sourced', 'invited'));
ALTER TABLE applications ADD COLUMN sourced_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN sourced_at TIMESTAMP(6);
ALTER TABLE applications ADD COLUMN invitation_sent_at TIMESTAMP(6);
ALTER TABLE applications ADD COLUMN invitation_token VARCHAR(255) UNIQUE;

CREATE INDEX idx_applications_source_type ON applications(source_type);
CREATE INDEX idx_applications_sourced_by ON applications(sourced_by);
COMMENT ON COLUMN applications.source_type IS 'How candidate entered pipeline: applied (self), sourced (admin added), invited (sent invitation)';
COMMENT ON COLUMN applications.sourced_by IS 'Admin user ID who sourced/invited this candidate';

-- Add skills/tags to users for talent pool search
ALTER TABLE users ADD COLUMN skills TEXT[]; -- Array of skill tags
ALTER TABLE users ADD COLUMN bio TEXT; -- Short professional bio
ALTER TABLE users ADD COLUMN linkedin_url VARCHAR(500);
ALTER TABLE users ADD COLUMN portfolio_url VARCHAR(500);
ALTER TABLE users ADD COLUMN years_experience INT;
ALTER TABLE users ADD COLUMN current_company VARCHAR(255);
ALTER TABLE users ADD COLUMN current_title VARCHAR(255);
ALTER TABLE users ADD COLUMN location VARCHAR(255);
ALTER TABLE users ADD COLUMN available_for_opportunities BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN last_profile_update TIMESTAMP(6) DEFAULT NOW();

CREATE INDEX idx_users_skills ON users USING GIN (skills);
CREATE INDEX idx_users_available ON users(available_for_opportunities);
CREATE INDEX idx_users_location ON users(location);

COMMENT ON COLUMN users.skills IS 'Array of skill tags for talent pool search';
COMMENT ON COLUMN users.available_for_opportunities IS 'Whether user is open to being contacted about opportunities';

-- Create talent pool interactions tracking table
CREATE TABLE talent_pool_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('viewed_profile', 'sent_invitation', 'added_note', 'sourced_to_job', 'emailed')),
  notes TEXT,
  metadata JSONB, -- Store additional context (email sent, invitation details, etc.)
  created_at TIMESTAMP(6) DEFAULT NOW()
);

CREATE INDEX idx_talent_pool_interactions_admin ON talent_pool_interactions(admin_id);
CREATE INDEX idx_talent_pool_interactions_candidate ON talent_pool_interactions(candidate_id);
CREATE INDEX idx_talent_pool_interactions_job ON talent_pool_interactions(job_id);
CREATE INDEX idx_talent_pool_interactions_type ON talent_pool_interactions(interaction_type);
CREATE INDEX idx_talent_pool_interactions_created_at ON talent_pool_interactions(created_at);

COMMENT ON TABLE talent_pool_interactions IS 'Track admin interactions with talent pool candidates';

-- Create job invitations table (for tracking invitation status)
CREATE TABLE job_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'applied', 'declined', 'expired')),
  message TEXT, -- Custom message from admin
  sent_at TIMESTAMP(6) DEFAULT NOW(),
  viewed_at TIMESTAMP(6),
  responded_at TIMESTAMP(6),
  expires_at TIMESTAMP(6) NOT NULL,
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW()
);

CREATE INDEX idx_job_invitations_job ON job_invitations(job_id);
CREATE INDEX idx_job_invitations_candidate ON job_invitations(candidate_id);
CREATE INDEX idx_job_invitations_invited_by ON job_invitations(invited_by);
CREATE INDEX idx_job_invitations_status ON job_invitations(status);
CREATE INDEX idx_job_invitations_token ON job_invitations(invitation_token);

CREATE UNIQUE INDEX idx_job_invitations_unique_active ON job_invitations(job_id, candidate_id)
WHERE status IN ('sent', 'viewed');

COMMENT ON TABLE job_invitations IS 'Track job invitations sent to talent pool candidates';
