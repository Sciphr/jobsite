-- Add application_type to jobs table
ALTER TABLE jobs ADD COLUMN application_type VARCHAR(20) DEFAULT 'quick' CHECK (application_type IN ('quick', 'full'));
CREATE INDEX idx_jobs_application_type ON jobs(application_type);

-- Create question_templates table for reusable questions
CREATE TABLE question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('text', 'textarea', 'multiple_choice', 'checkbox', 'yes_no', 'file_upload', 'date')),
  options JSONB, -- For multiple_choice and checkbox types, stores array of options
  is_required BOOLEAN DEFAULT false,
  placeholder_text VARCHAR(255),
  help_text TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW(),
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMP(6),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_question_templates_created_by ON question_templates(created_by);
CREATE INDEX idx_question_templates_is_active ON question_templates(is_active);
CREATE INDEX idx_question_templates_question_type ON question_templates(question_type);

-- Create job_screening_questions table (questions specific to a job)
CREATE TABLE job_screening_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('text', 'textarea', 'multiple_choice', 'checkbox', 'yes_no', 'file_upload', 'date')),
  options JSONB, -- For multiple_choice and checkbox types
  is_required BOOLEAN DEFAULT false,
  placeholder_text VARCHAR(255),
  help_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_from_template_id UUID REFERENCES question_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW()
);

CREATE INDEX idx_job_screening_questions_job_id ON job_screening_questions(job_id);
CREATE INDEX idx_job_screening_questions_sort_order ON job_screening_questions(job_id, sort_order);
CREATE INDEX idx_job_screening_questions_template_id ON job_screening_questions(created_from_template_id);

-- Create application_screening_answers table (applicant responses)
CREATE TABLE application_screening_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES job_screening_questions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL, -- Store question text in case question is edited/deleted later
  answer_text TEXT, -- For text, textarea, yes_no, date types
  answer_json JSONB, -- For multiple_choice, checkbox, or complex answers
  file_url VARCHAR(500), -- For file_upload type
  file_name VARCHAR(255),
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW()
);

CREATE INDEX idx_application_screening_answers_application_id ON application_screening_answers(application_id);
CREATE INDEX idx_application_screening_answers_question_id ON application_screening_answers(question_id);

-- Add comments for documentation
COMMENT ON TABLE question_templates IS 'Reusable screening question templates that can be used across multiple jobs';
COMMENT ON TABLE job_screening_questions IS 'Screening questions specific to each job posting';
COMMENT ON TABLE application_screening_answers IS 'Applicant responses to screening questions';

COMMENT ON COLUMN jobs.application_type IS 'Type of application form: quick (basic info only) or full (with screening questions)';
COMMENT ON COLUMN question_templates.options IS 'JSON array of options for multiple_choice and checkbox question types';
COMMENT ON COLUMN job_screening_questions.sort_order IS 'Order in which questions appear in the application form';
COMMENT ON COLUMN application_screening_answers.answer_json IS 'JSON data for complex answers like multiple selections';
