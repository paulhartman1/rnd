-- Add geocoding columns to properties table for map visualization
-- This enables storing latitude/longitude coordinates from geocoding services

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS geocode_source TEXT;

-- Create partial index for fast lookups of geocoded properties
-- Only indexes properties that have coordinates (saves space and improves performance)
CREATE INDEX IF NOT EXISTS idx_properties_coordinates 
ON public.properties(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index for finding properties that need geocoding
CREATE INDEX IF NOT EXISTS idx_properties_needs_geocoding 
ON public.properties(id) 
WHERE latitude IS NULL AND street_address IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.properties.latitude IS 'Latitude coordinate from geocoding service (WGS84). Range: -90 to 90';
COMMENT ON COLUMN public.properties.longitude IS 'Longitude coordinate from geocoding service (WGS84). Range: -180 to 180';
COMMENT ON COLUMN public.properties.geocoded_at IS 'Timestamp when property was last geocoded';
COMMENT ON COLUMN public.properties.geocode_source IS 'Geocoding service used (e.g., "nominatim", "google", "mapbox")';
