-- Migration script to update existing jobs to use the new foreign key relationships
-- Run this AFTER creating the tables and seeding the default data

-- Update jobs to reference employment_types
UPDATE jobs 
SET employment_type_id = et.id 
FROM employment_types et 
WHERE jobs."employmentType" = et.name
AND jobs.employment_type_id IS NULL;

-- Update jobs to reference experience_levels
UPDATE jobs 
SET experience_level_id = el.id 
FROM experience_levels el 
WHERE jobs."experienceLevel" = el.name
AND jobs.experience_level_id IS NULL;

-- Update jobs to reference remote_policies
UPDATE jobs 
SET remote_policy_id = rp.id 
FROM remote_policies rp 
WHERE jobs."remotePolicy" = rp.name
AND jobs.remote_policy_id IS NULL;

-- Check for any jobs that couldn't be matched (optional - for debugging)
SELECT 
    id, 
    title, 
    "employmentType", 
    "experienceLevel", 
    "remotePolicy"
FROM jobs 
WHERE employment_type_id IS NULL 
   OR experience_level_id IS NULL 
   OR remote_policy_id IS NULL;


ALTER TABLE jobs ADD CONSTRAINT fk_jobs_employment_type_id FOREIGN KEY (employment_type_id) REFERENCES employment_types (id);
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_experience_level_id FOREIGN KEY (experience_level_id) REFERENCES experience_levels (id);
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_remote_policy_id FOREIGN KEY (remote_policy_id) REFERENCES remote_policies (id);

And eventually, after ensuring everything works, you can drop the old columns:
ALTER TABLE jobs DROP COLUMN "employmentType";
ALTER TABLE jobs DROP COLUMN "experienceLevel"; 
ALTER TABLE jobs DROP COLUMN "remotePolicy";