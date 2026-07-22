/**
 * Property Valuation Domain Types
 * 
 * Core types for the property valuation system.
 * Valuations track property values with purpose, source, and metadata.
 */

export type ValuationPurpose =
  | 'as_is_market_value'
  | 'after_repair_value'
  | 'underwriting_value'
  | 'other';

export type ValuationMethod =
  | 'automated_provider'
  | 'manual_entry'
  | 'comp_analysis'
  | 'broker_price_opinion'
  | 'appraisal'
  | 'other';

/**
 * Property Valuation Database Row
 * Matches the property_valuations table schema
 */
export interface PropertyValuation {
  id: string;
  property_id: string;
  
  // Valuation amount and purpose
  value: number;
  valuation_purpose: ValuationPurpose;
  
  // Valuation metadata
  valuation_method: ValuationMethod | null;
  valuation_source: string | null;
  valuation_date: string; // ISO date string
  
  // Confidence and quality
  confidence_score: number | null;
  comparable_count: number | null;
  
  // Additional context
  notes: string | null;
  provider_metadata: Record<string, any>;
  
  // Audit
  created_by: string | null;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

/**
 * Input for creating a new property valuation
 */
export interface CreatePropertyValuationInput {
  property_id: string;
  value: number;
  valuation_purpose: ValuationPurpose;
  valuation_method?: ValuationMethod;
  valuation_source?: string;
  valuation_date?: string; // ISO date, defaults to today
  confidence_score?: number;
  comparable_count?: number;
  notes?: string;
  provider_metadata?: Record<string, any>;
  created_by?: string; // Defaults to current user
}

/**
 * Input for updating a property valuation
 * Only notes can be updated after creation
 */
export interface UpdatePropertyValuationInput {
  notes?: string;
}

/**
 * Extended property valuation with property details
 */
export interface PropertyValuationWithProperty extends PropertyValuation {
  property: {
    id: string;
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
  };
}

/**
 * Normalized valuation from external providers
 */
export interface NormalizedValuation {
  value: number;
  valuationPurpose: ValuationPurpose;
  valuationDate: Date;
  confidence?: number;
  comparableCount?: number;
  metadata: Record<string, any>;
}

/**
 * Valuation provider interface
 * Implement this for each external provider (RentCast, ATTOM, etc.)
 */
export interface ValuationProvider {
  name: string;
  getValuation(address: PropertyAddress): Promise<NormalizedValuation>;
}

/**
 * Property address for provider lookups
 */
export interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

/**
 * Valuation summary for display
 */
export interface ValuationSummary {
  id: string;
  value: number;
  purpose: ValuationPurpose;
  purposeLabel: string;
  source: string | null;
  date: string;
  confidence: number | null;
  isCurrent: boolean;
}
