-- Add fields to specify what happens when conditional logic is met
ALTER TABLE question_mappings
ADD COLUMN conditional_to_question_id UUID REFERENCES intake_questions(id),
ADD COLUMN conditional_redirect_url TEXT;

COMMENT ON COLUMN question_mappings.conditional_to_question_id IS 'Question to navigate to when conditional_logic evaluates to true';
COMMENT ON COLUMN question_mappings.conditional_redirect_url IS 'URL to redirect to when conditional_logic evaluates to true';
