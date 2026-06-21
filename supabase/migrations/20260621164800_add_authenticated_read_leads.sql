-- Add RLS policy for authenticated users to read leads
-- This is needed for the map view to fetch leads data via foreign key joins

CREATE POLICY "Authenticated users can read leads"
ON public.leads
FOR SELECT
TO authenticated
USING (true);
