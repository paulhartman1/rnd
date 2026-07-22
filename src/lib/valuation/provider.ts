/**
 * Valuation Provider Abstraction
 * 
 * Interface and utilities for integrating external valuation providers.
 * Providers normalize their responses into a consistent format.
 * 
 * Future providers: RentCast, ATTOM, PropStream, etc.
 */

import type {
  ValuationProvider,
  NormalizedValuation,
  PropertyAddress,
  CreatePropertyValuationInput,
} from './types';

/**
 * Base class for valuation providers
 * Extend this to implement specific providers
 */
export abstract class BaseValuationProvider implements ValuationProvider {
  abstract name: string;
  abstract getValuation(address: PropertyAddress): Promise<NormalizedValuation>;

  /**
   * Convert normalized valuation to database input
   * Preserves provider metadata for audit trail
   */
  toCreateInput(
    propertyId: string,
    normalized: NormalizedValuation,
    userId?: string
  ): CreatePropertyValuationInput {
    return {
      property_id: propertyId,
      value: normalized.value,
      valuation_purpose: normalized.valuationPurpose,
      valuation_method: 'automated_provider',
      valuation_source: this.name,
      valuation_date: normalized.valuationDate.toISOString().split('T')[0],
      confidence_score: normalized.confidence || null,
      comparable_count: normalized.comparableCount || null,
      provider_metadata: {
        provider: this.name,
        ...normalized.metadata,
      },
      created_by: userId,
    };
  }
}

/**
 * Mock provider for testing
 * Returns dummy data for development/testing
 */
export class MockValuationProvider extends BaseValuationProvider {
  name = 'Mock Provider';

  async getValuation(address: PropertyAddress): Promise<NormalizedValuation> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate mock data based on address
    const baseValue = 300000 + Math.random() * 200000;

    return {
      value: Math.round(baseValue),
      valuationPurpose: 'as_is_market_value',
      valuationDate: new Date(),
      confidence: Math.floor(70 + Math.random() * 30),
      comparableCount: Math.floor(8 + Math.random() * 12),
      metadata: {
        mock: true,
        address: `${address.street}, ${address.city}, ${address.state}`,
        avm_high: Math.round(baseValue * 1.05),
        avm_low: Math.round(baseValue * 0.95),
      },
    };
  }
}

/**
 * RentCast Provider (placeholder)
 * Implement when integrating RentCast API
 */
export class RentCastProvider extends BaseValuationProvider {
  name = 'RentCast';

  constructor(private apiKey: string) {
    super();
  }

  async getValuation(address: PropertyAddress): Promise<NormalizedValuation> {
    // TODO: Implement RentCast API integration
    // - Call RentCast property valuation endpoint
    // - Parse response
    // - Map to NormalizedValuation
    // - Store full response in metadata

    throw new Error('RentCast provider not yet implemented');
  }
}

/**
 * ATTOM Provider (placeholder)
 * Implement when integrating ATTOM API
 */
export class ATTOMProvider extends BaseValuationProvider {
  name = 'ATTOM';

  constructor(private apiKey: string) {
    super();
  }

  async getValuation(address: PropertyAddress): Promise<NormalizedValuation> {
    // TODO: Implement ATTOM API integration
    // - Call ATTOM property valuation endpoint
    // - Parse response  
    // - Map to NormalizedValuation
    // - Store full response in metadata

    throw new Error('ATTOM provider not yet implemented');
  }
}

/**
 * Provider factory
 * Creates provider instances based on configuration
 */
export function createProvider(
  providerName: string,
  config?: { apiKey?: string }
): ValuationProvider {
  switch (providerName.toLowerCase()) {
    case 'mock':
      return new MockValuationProvider();

    case 'rentcast':
      if (!config?.apiKey) {
        throw new Error('RentCast API key required');
      }
      return new RentCastProvider(config.apiKey);

    case 'attom':
      if (!config?.apiKey) {
        throw new Error('ATTOM API key required');
      }
      return new ATTOMProvider(config.apiKey);

    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

/**
 * Helper to format property address for provider lookup
 */
export function formatPropertyAddress(property: {
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
}): PropertyAddress {
  return {
    street: property.street_address,
    city: property.city,
    state: property.state,
    postalCode: property.postal_code,
  };
}
