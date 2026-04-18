-- Enable RLS on reviews table (if not already enabled)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active, non-deleted reviews
DROP POLICY IF EXISTS "Public can view active reviews" ON reviews;
CREATE POLICY "Public can view active reviews"
ON reviews
FOR SELECT
TO anon, authenticated
USING (
  is_active = true 
  AND deleted_at IS NULL
);

-- Ensure service role has full access (for admin operations)
DROP POLICY IF EXISTS "Service role has full access to reviews" ON reviews;
CREATE POLICY "Service role has full access to reviews"
ON reviews
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
