/**
 * Property-related types and utilities
 */

export type PropertyRow = {
  id: string;
  lead_id: string;
  
  // Address
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  county: string | null;
  
  // Identifiers
  apn: string | null;
  
  // Owner information
  owner2_first_name: string | null;
  owner2_last_name: string | null;
  
  // Contact
  email: string | null;
  email2: string | null;
  
  // Property status/flags
  is_vacant: boolean | null;
  opt_out: boolean | null;
  owner_occupied: boolean | null;
  self_managed: boolean | null;
  
  // Property details
  property_type: string | null;
  property_type_detail: string | null;
  parcel_count: number | null;
  bedroom_count: number | null;
  bathroom_count: number | null;
  total_building_area_sqft: number | null;
  lot_size_sqft: number | null;
  year_built: number | null;
  
  // Financial
  total_assessed_value: number | null;
  estimated_value: number | null;
  total_loan_balance: number | null;
  equity_current_estimated_balance: number | null;
  ltv_current_estimated_combined: number | null;
  
  // Zoning
  zoning_code: string | null;
  
  // Sale history
  last_sale_date: string | null;
  last_sale_price: number | null;
  
  // MLS
  mls_status: string | null;
  
  // Foreclosure
  foreclosure_document_type: string | null;
  foreclosure_status: string | null;
  foreclosure_auction_date: string | null;
  foreclosure_loan_default_date: string | null;
  
  // Notes
  notes: string | null;
  
  // Geocoding
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
  geocode_source: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
};
