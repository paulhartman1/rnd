/**
 * Property-related types and utilities
 */

export type PropertyRow = {
  id: string;
  lead_id: string | null;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  apn: string | null;
  property_type: string | null;
  created_at: string;
  updated_at: string;
};
