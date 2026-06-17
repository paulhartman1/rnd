CREATE TABLE IF NOT EXISTS page_feedback_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  x_position NUMERIC NOT NULL,
  y_position NUMERIC NOT NULL,
  viewport_width INTEGER,
  comment_text TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
  status TEXT NOT NULL DEFAULT 'new', -- new, in-progress, resolved
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_feedback_comments_url ON page_feedback_comments(url);
CREATE INDEX IF NOT EXISTS idx_page_feedback_comments_created_at ON page_feedback_comments(created_at DESC);

ALTER TABLE page_feedback_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read page feedback comments"
  ON page_feedback_comments
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can insert own page feedback comments"
  ON page_feedback_comments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);