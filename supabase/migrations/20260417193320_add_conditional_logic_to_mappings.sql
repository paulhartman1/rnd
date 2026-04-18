-- Add conditional_logic field to question_mappings
-- This allows checking answers to ANY previous question, not just the immediate prior one
ALTER TABLE public.question_mappings
ADD COLUMN IF NOT EXISTS conditional_logic jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.question_mappings.conditional_logic IS 
'JSON array of conditions to check against previous answers. Format:
{
  "operator": "AND" | "OR",
  "conditions": [
    {
      "question_id": "uuid",
      "answer_value": "value to match",
      "operator": "equals" | "not_equals" | "contains" | "not_contains"
    }
  ]
}
Example: Check if user answered "Foreclosure" to any previous question:
{
  "operator": "OR",
  "conditions": [
    {"question_id": "abc-123", "answer_value": "Foreclosure", "operator": "equals"}
  ]
}
';

-- Create index for better performance when querying conditional logic
CREATE INDEX IF NOT EXISTS question_mappings_conditional_idx 
ON public.question_mappings USING GIN (conditional_logic);
