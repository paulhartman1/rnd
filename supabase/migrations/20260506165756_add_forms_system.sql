-- Add forms system: properties table, forms table, and feature flag

-- Properties Table
-- One lead can own/represent multiple properties (1:many)
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  apn TEXT,
  property_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Forms Table
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL CHECK (form_type IN ('purchase_agreement')),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed', 'cancelled')),
  docusign_envelope_id TEXT,
  docusign_status TEXT,
  signed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for properties
CREATE INDEX IF NOT EXISTS idx_properties_lead_id ON public.properties(lead_id);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);

-- Indexes for forms
CREATE INDEX IF NOT EXISTS idx_forms_lead_id ON public.forms(lead_id);
CREATE INDEX IF NOT EXISTS idx_forms_property_id ON public.forms(property_id);
CREATE INDEX IF NOT EXISTS idx_forms_form_type ON public.forms(form_type);
CREATE INDEX IF NOT EXISTS idx_forms_status ON public.forms(status);
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON public.forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON public.forms(created_at DESC);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS properties_set_updated_at ON public.properties;
CREATE TRIGGER properties_set_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS forms_set_updated_at ON public.forms;
CREATE TRIGGER forms_set_updated_at
BEFORE UPDATE ON public.forms
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for properties
DROP POLICY IF EXISTS "Service role can read properties" ON public.properties;
CREATE POLICY "Service role can read properties"
ON public.properties
FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS "Service role can insert properties" ON public.properties;
CREATE POLICY "Service role can insert properties"
ON public.properties
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update properties" ON public.properties;
CREATE POLICY "Service role can update properties"
ON public.properties
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete properties" ON public.properties;
CREATE POLICY "Service role can delete properties"
ON public.properties
FOR DELETE
TO service_role
USING (true);

-- RLS Policies for forms
DROP POLICY IF EXISTS "Service role can read forms" ON public.forms;
CREATE POLICY "Service role can read forms"
ON public.forms
FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS "Service role can insert forms" ON public.forms;
CREATE POLICY "Service role can insert forms"
ON public.forms
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update forms" ON public.forms;
CREATE POLICY "Service role can update forms"
ON public.forms
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete forms" ON public.forms;
CREATE POLICY "Service role can delete forms"
ON public.forms
FOR DELETE
TO service_role
USING (true);

-- Add forms feature flag
INSERT INTO public.feature_flags (flag_key, flag_name, description, is_enabled, allowed_users)
VALUES (
  'forms',
  'Forms & Documents',
  'Enable purchase agreements and document generation',
  false,
  ARRAY['paulhartman.bassist@gmail.com', 'christie.swoboda@gmail.com']
)
ON CONFLICT (flag_key) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.properties IS 'Properties associated with leads - separate from lead mailing addresses';
COMMENT ON TABLE public.forms IS 'Legal forms and documents (purchase agreements, etc.)';
COMMENT ON COLUMN public.properties.apn IS 'Assessor Parcel Number';
COMMENT ON COLUMN public.forms.form_data IS 'JSONB storage for form field values';
