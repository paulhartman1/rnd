-- Skip-trace import: provenance-first enrichment of existing BatchLeads properties.
-- This is a DISTINCT concern from property import. It never creates leads/properties.

CREATE TABLE IF NOT EXISTS public.skip_trace_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  total_rows integer NOT NULL DEFAULT 0,
  matched integer NOT NULL DEFAULT 0,
  matched_no_lead integer NOT NULL DEFAULT 0,
  unmatched integer NOT NULL DEFAULT 0,
  ambiguous integer NOT NULL DEFAULT 0,
  malformed integer NOT NULL DEFAULT 0,
  phones_added integer NOT NULL DEFAULT 0,
  emails_added integer NOT NULL DEFAULT 0,
  dupes_ignored integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.skip_trace_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.skip_trace_imports(id) ON DELETE CASCADE,
  raw_row jsonb NOT NULL,
  apn_raw text,
  state_raw text,
  county_raw text,
  apn_norm text,
  state_norm text,
  county_norm text,
  match_key text,
  match_status text NOT NULL CHECK (match_status IN ('matched','matched_no_lead','unmatched','ambiguous','malformed')),
  matched_batchlead_id uuid REFERENCES public.batchleads(id) ON DELETE SET NULL,
  matched_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  candidate_lead_ids jsonb,
  phones_added integer NOT NULL DEFAULT 0,
  emails_added integer NOT NULL DEFAULT 0,
  dupes_ignored integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skip_trace_rows_import_idx ON public.skip_trace_rows (import_id);
CREATE INDEX IF NOT EXISTS skip_trace_rows_status_idx ON public.skip_trace_rows (match_status);
CREATE INDEX IF NOT EXISTS skip_trace_rows_match_key_idx ON public.skip_trace_rows (match_key);

ALTER TABLE public.skip_trace_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skip_trace_rows ENABLE ROW LEVEL SECURITY;

-- Service role: full access
DROP POLICY IF EXISTS "Service role full access skip_trace_imports" ON public.skip_trace_imports;
CREATE POLICY "Service role full access skip_trace_imports" ON public.skip_trace_imports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access skip_trace_rows" ON public.skip_trace_rows;
CREATE POLICY "Service role full access skip_trace_rows" ON public.skip_trace_rows
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated: read-only (report visibility)
DROP POLICY IF EXISTS "Authenticated read skip_trace_imports" ON public.skip_trace_imports;
CREATE POLICY "Authenticated read skip_trace_imports" ON public.skip_trace_imports
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read skip_trace_rows" ON public.skip_trace_rows;
CREATE POLICY "Authenticated read skip_trace_rows" ON public.skip_trace_rows
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.skip_trace_imports IS 'One row per uploaded BatchLeads skip-trace CSV. Enrichment only; never creates leads/properties.';
COMMENT ON TABLE public.skip_trace_rows IS 'Per-row provenance for skip-trace imports: raw row, normalized match key, match outcome, and enrichment target.';
