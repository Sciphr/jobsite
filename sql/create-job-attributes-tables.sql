-- Create employment_types table
CREATE TABLE employment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create experience_levels table
CREATE TABLE experience_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create remote_policies table
CREATE TABLE remote_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_employment_types_active_sort ON employment_types (is_active, sort_order);
CREATE INDEX idx_experience_levels_active_sort ON experience_levels (is_active, sort_order);
CREATE INDEX idx_remote_policies_active_sort ON remote_policies (is_active, sort_order);

-- Add new foreign key columns to jobs table (nullable for now)
ALTER TABLE jobs ADD COLUMN employment_type_id UUID;
ALTER TABLE jobs ADD COLUMN experience_level_id UUID;
ALTER TABLE jobs ADD COLUMN remote_policy_id UUID;

-- Make the old string columns nullable for backward compatibility during migration
ALTER TABLE jobs ALTER COLUMN employment_type DROP NOT NULL;
ALTER TABLE jobs ALTER COLUMN experience_level DROP NOT NULL;
ALTER TABLE jobs ALTER COLUMN remote_policy DROP NOT NULL;

-- Add foreign key constraints (will be added after data migration)
-- ALTER TABLE jobs ADD CONSTRAINT fk_jobs_employment_type_id FOREIGN KEY (employment_type_id) REFERENCES employment_types (id);
-- ALTER TABLE jobs ADD CONSTRAINT fk_jobs_experience_level_id FOREIGN KEY (experience_level_id) REFERENCES experience_levels (id);
-- ALTER TABLE jobs ADD CONSTRAINT fk_jobs_remote_policy_id FOREIGN KEY (remote_policy_id) REFERENCES remote_policies (id);

-- Create indexes on the new foreign key columns
CREATE INDEX idx_jobs_employment_type_id ON jobs (employment_type_id);
CREATE INDEX idx_jobs_experience_level_id ON jobs (experience_level_id);
CREATE INDEX idx_jobs_remote_policy_id ON jobs (remote_policy_id);

-- Insert default employment types
INSERT INTO employment_types (name, description, sort_order) VALUES
    ('Full-time', 'Full-time employment', 1),
    ('Part-time', 'Part-time employment', 2),
    ('Contract', 'Contract work', 3),
    ('Temporary', 'Temporary work', 4),
    ('Freelance', 'Freelance work', 5),
    ('Internship', 'Internship position', 6);

-- Insert default experience levels
INSERT INTO experience_levels (name, description, sort_order) VALUES
    ('Entry Level', '0-2 years of experience', 1),
    ('Mid Level', '2-5 years of experience', 2),
    ('Senior Level', '5+ years of experience', 3),
    ('Lead Level', '7+ years with leadership experience', 4),
    ('Executive Level', 'Executive or C-level positions', 5);

-- Insert default remote policies
INSERT INTO remote_policies (name, description, sort_order) VALUES
    ('On-site', 'Work must be performed on-site', 1),
    ('Remote', 'Fully remote work allowed', 2),
    ('Hybrid', 'Mix of remote and on-site work', 3),
    ('Remote-first', 'Remote work preferred with occasional on-site', 4);