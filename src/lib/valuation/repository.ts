/**
 * Property Valuation Repository
 * 
 * Data access layer for property valuations.
 * Handles all database operations for the valuation domain.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  PropertyValuation,
  CreatePropertyValuationInput,
  UpdatePropertyValuationInput,
  PropertyValuationWithProperty,
  ValuationSummary,
} from './types';

export class PropertyValuationRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new property valuation
   */
  async create(input: CreatePropertyValuationInput): Promise<PropertyValuation> {
    const { data, error } = await this.supabase
      .from('property_valuations')
      .insert({
        property_id: input.property_id,
        value: input.value,
        valuation_purpose: input.valuation_purpose,
        valuation_method: input.valuation_method || null,
        valuation_source: input.valuation_source || null,
        valuation_date: input.valuation_date || new Date().toISOString().split('T')[0],
        confidence_score: input.confidence_score || null,
        comparable_count: input.comparable_count || null,
        notes: input.notes || null,
        provider_metadata: input.provider_metadata || {},
        created_by: input.created_by || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create property valuation: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a single property valuation by ID
   */
  async getById(id: string): Promise<PropertyValuation | null> {
    const { data, error } = await this.supabase
      .from('property_valuations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch property valuation: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all valuations for a specific property
   */
  async getByPropertyId(propertyId: string): Promise<PropertyValuation[]> {
    const { data, error } = await this.supabase
      .from('property_valuations')
      .select('*')
      .eq('property_id', propertyId)
      .order('valuation_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch property valuations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get valuation summaries for a property (for history display)
   */
  async getSummariesForProperty(
    propertyId: string,
    currentValuationId?: string | null
  ): Promise<ValuationSummary[]> {
    const valuations = await this.getByPropertyId(propertyId);

    return valuations.map((v) => ({
      id: v.id,
      value: v.value,
      purpose: v.valuation_purpose,
      purposeLabel: formatValuationPurpose(v.valuation_purpose),
      source: v.valuation_source,
      date: v.valuation_date,
      confidence: v.confidence_score,
      isCurrent: v.id === currentValuationId,
    }));
  }

  /**
   * Get current valuation for a property
   */
  async getCurrentForProperty(propertyId: string): Promise<PropertyValuation | null> {
    // First get the property to find current_valuation_id
    const { data: property, error: propertyError } = await this.supabase
      .from('properties')
      .select('current_valuation_id')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property?.current_valuation_id) {
      return null;
    }

    return this.getById(property.current_valuation_id);
  }

  /**
   * Update a property valuation (notes only)
   */
  async update(id: string, input: UpdatePropertyValuationInput): Promise<PropertyValuation> {
    const { data, error } = await this.supabase
      .from('property_valuations')
      .update({
        notes: input.notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update property valuation: ${error.message}`);
    }

    return data;
  }

  /**
   * Set a valuation as the current valuation for its property
   */
  async setAsCurrent(valuationId: string): Promise<void> {
    // First get the valuation to find its property_id
    const valuation = await this.getById(valuationId);
    if (!valuation) {
      throw new Error('Valuation not found');
    }

    // Update the property's current_valuation_id
    // This will automatically sync estimated_value via trigger
    const { error } = await this.supabase
      .from('properties')
      .update({ current_valuation_id: valuationId })
      .eq('id', valuation.property_id);

    if (error) {
      throw new Error(`Failed to set current valuation: ${error.message}`);
    }
  }

  /**
   * Get valuations with property details (for admin views)
   */
  async getWithProperty(valuationId: string): Promise<PropertyValuationWithProperty | null> {
    const { data, error } = await this.supabase
      .from('property_valuations')
      .select(
        `
        *,
        property:properties (
          id,
          street_address,
          city,
          state,
          postal_code
        )
      `
      )
      .eq('id', valuationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch valuation with property: ${error.message}`);
    }

    return data;
  }

  /**
   * Get recent valuations across all properties (for dashboard/reports)
   */
  async getRecent(limit: number = 10): Promise<PropertyValuationWithProperty[]> {
    const { data, error } = await this.supabase
      .from('property_valuations')
      .select(
        `
        *,
        property:properties (
          id,
          street_address,
          city,
          state,
          postal_code
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent valuations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get valuations by purpose (e.g., all ARV valuations)
   */
  async getByPurpose(
    purpose: string,
    limit?: number
  ): Promise<PropertyValuationWithProperty[]> {
    let query = this.supabase
      .from('property_valuations')
      .select(
        `
        *,
        property:properties (
          id,
          street_address,
          city,
          state,
          postal_code
        )
      `
      )
      .eq('valuation_purpose', purpose)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch valuations by purpose: ${error.message}`);
    }

    return data || [];
  }
}

/**
 * Format valuation purpose for display
 */
function formatValuationPurpose(purpose: string): string {
  const labels: Record<string, string> = {
    as_is_market_value: 'As-Is Market Value',
    after_repair_value: 'After Repair Value (ARV)',
    underwriting_value: 'Underwriting Value',
    other: 'Other',
  };

  return labels[purpose] || purpose;
}

/**
 * Helper to create a repository instance with a Supabase client
 */
export function createPropertyValuationRepository(
  supabase: SupabaseClient
): PropertyValuationRepository {
  return new PropertyValuationRepository(supabase);
}
