-- Add application_notes table for timeline functionality
CREATE TABLE application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'note' NOT NULL,
    author_id UUID,
    author_name VARCHAR(255),
    created_at TIMESTAMP(6) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(6) DEFAULT NOW() NOT NULL,
    metadata JSONB,
    is_system_generated BOOLEAN DEFAULT FALSE,
    
    -- Foreign key constraints
    CONSTRAINT fk_application_notes_application 
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_application_notes_author 
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_application_notes_application_id ON application_notes(application_id);
CREATE INDEX idx_application_notes_created_at ON application_notes(created_at);
CREATE INDEX idx_application_notes_type ON application_notes(type);
CREATE INDEX idx_application_notes_author_id ON application_notes(author_id);

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_application_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_application_notes_updated_at
    BEFORE UPDATE ON application_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_application_notes_updated_at();