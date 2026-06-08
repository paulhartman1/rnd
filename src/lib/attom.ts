/**
 * Attom API Integration
 * Handles all interactions with the Attom Data API for property lead generation
 * 
 * NOTE: Free trial API keys have limited access and may not support:
 * - Property searches by zip code, city, or county
 * - Expanded profile endpoints
 * - Bulk property queries
 * 
 * Trial keys typically only work with specific demo properties or sample data.
 * For production use, a paid API subscription is required.
 */

export interface AttomPropertyCriteria {
  zipCodes?: string[];
  states?: string[];
  cities?: string[];
  counties?: string[];
  minBedrooms?: number;
  minBathrooms?: number;
  minSqft?: number;
  maxSqft?: number;
  minLotSize?: number;
  propertyTypes?: string[];
  maxPropertyAge?: number;
  minEquityPercent?: number;
  ownershipType?: 'absentee' | 'corporate' | 'out-of-state' | 'all';
  isDistressed?: boolean;
  minMarketValue?: number;
  maxMarketValue?: number;
}

export interface AttomProperty {
  address: {
    line1: string;
    line2?: string;
    locality: string;
    countrySubd: string;
    postal1: string;
    postal2?: string;
  };
  lot?: {
    lotSize1?: number;
    lotSize2?: number;
  };
  building?: {
    size: {
      bldgSize?: number;
      grossSize?: number;
    };
    rooms?: {
      beds?: number;
      bathsTotal?: number;
    };
    construction?: {
      yearBuilt?: number;
    };
  };
  owner?: {
    owner1?: {
      firstNameAndMI?: string;
      lastName?: string;
      fullName?: string;
    };
    corporateIndicator?: string;
    absenteeIndicator?: string;
    mailingAddress?: {
      line1?: string;
      locality?: string;
      countrySubd?: string;
      postal1?: string;
    };
  };
  assessment?: {
    assessed?: {
      assdTtlValue?: number;
    };
    market?: {
      mktTtlValue?: number;
    };
  };
  avm?: {
    amount?: {
      value?: number;
    };
  };
  sale?: {
    saleTransDate?: string;
    amount?: {
      saleAmt?: number;
    };
  };
  identifier?: {
    apn?: string;
    attomId?: string;
  };
}

export class AttomAPIClient {
  private apiKey: string;
  private baseUrl: string;
  private cacheTTL: number;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.ATTOM_API_KEY || '';
    this.baseUrl = baseUrl || process.env.ATTOM_API_URL || 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
    this.cacheTTL = parseInt(process.env.ATTOM_CACHE_TTL || '86400');
    
    if (!this.apiKey) {
      throw new Error('Attom API key is required');
    }
  }

  private buildSearchParams(criteria: AttomPropertyCriteria): Record<string, string> {
    const params: Record<string, string> = {};
    
    // Geographic filters - only include if explicitly provided
    if (criteria.zipCodes && criteria.zipCodes.length > 0) {
      params['postalcode'] = criteria.zipCodes[0]; // Attom only supports one zip per request
    }
    // DO NOT include state parameter - it causes "Invalid Parameter" errors on bulk endpoints
    // The API infers state from zip code
    
    // Property characteristic filters (server-side filtering)
    // Use exact casing from Attom API docs
    if (criteria.minBedrooms) params['minBeds'] = criteria.minBedrooms.toString();
    if (criteria.minBathrooms) params['minBathsTotal'] = criteria.minBathrooms.toString();
    if (criteria.minSqft) params['minUniversalSize'] = criteria.minSqft.toString();
    if (criteria.maxSqft) params['maxUniversalSize'] = criteria.maxSqft.toString();
    if (criteria.minLotSize) params['minLotSize2'] = criteria.minLotSize.toString(); // lotsize2 is sqft
    if (criteria.maxPropertyAge) {
      const minYear = new Date().getFullYear() - criteria.maxPropertyAge;
      params['minYearBuilt'] = minYear.toString();
    }
    
    // Property type filter
    if (criteria.propertyTypes && criteria.propertyTypes.length > 0) {
      params['propertyType'] = criteria.propertyTypes.join('|');
    }
    
    // Property indicator (10=SFR, 22=Apartment, etc)
    // Default to 10 (single family residence) if not specified
    params['propertyIndicator'] = '10';
    
    // Valuation filters
    if (criteria.minMarketValue) params['minMktTtlValue'] = criteria.minMarketValue.toString();
    if (criteria.maxMarketValue) params['maxMktTtlValue'] = criteria.maxMarketValue.toString();
    
    return params;
  }

  private async callEndpoint(
    endpoint: string,
    criteria: AttomPropertyCriteria,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{ properties: AttomProperty[]; total: number; hasMore: boolean }> {
    const params = this.buildSearchParams(criteria);
    params['page'] = page.toString();
    params['pagesize'] = Math.min(pageSize, 100).toString();

    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${endpoint}?${queryString}`;

    const { cached, getCacheKey } = await import('./cache');
    const cacheKey = getCacheKey(`attom:${endpoint}`, queryString);

    return await cached(cacheKey, this.cacheTTL, async () => {
      console.log(`Calling Attom API ${endpoint}: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
          'Accept': 'application/json',
        },
      });

      const responseText = await response.text();
      console.log(`Attom API Response (${response.status}):`, responseText.substring(0, 500));

      const data = JSON.parse(responseText);
      
      // Attom returns 400 with "SuccessWithoutResult" when no properties found
      // Treat this as a valid empty result, not an error
      if (!response.ok && data.status?.msg !== 'SuccessWithoutResult') {
        throw new Error(`Attom API error: ${response.status} - ${responseText}`);
      }

      const properties = data.property || [];
      const total = data.status?.total || 0;
      const hasMore = page * pageSize < total;

      console.log(`Found ${properties.length} properties, total: ${total}`);

      return { properties, total, hasMore };
    });
  }

  async searchSnapshot(
    criteria: AttomPropertyCriteria,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{ properties: AttomProperty[]; total: number; hasMore: boolean }> {
    return this.callEndpoint('property/snapshot', criteria, page, pageSize);
  }

  async searchDetailOwner(
    criteria: AttomPropertyCriteria,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{ properties: AttomProperty[]; total: number; hasMore: boolean }> {
    return this.callEndpoint('property/detailowner', criteria, page, pageSize);
  }

  async searchAVM(
    criteria: AttomPropertyCriteria,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{ properties: AttomProperty[]; total: number; hasMore: boolean }> {
    return this.callEndpoint('attomavm/detail', criteria, page, pageSize);
  }

  async searchSales(
    criteria: AttomPropertyCriteria,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{ properties: AttomProperty[]; total: number; hasMore: boolean }> {
    return this.callEndpoint('sale/detail', criteria, page, pageSize);
  }

  // Deprecated: use searchSnapshot instead
  async searchProperties(
    criteria: AttomPropertyCriteria,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{ properties: AttomProperty[]; total: number; hasMore: boolean }> {
    return this.searchSnapshot(criteria, page, pageSize);
  }

  calculateEquityPercent(property: AttomProperty): number | null {
    const marketValue = property.avm?.amount?.value || property.assessment?.market?.mktTtlValue;
    const lastSalePrice = property.sale?.amount?.saleAmt;

    if (!marketValue || !lastSalePrice || lastSalePrice === 0) return null;

    const equity = ((marketValue - lastSalePrice) / marketValue) * 100;
    return Math.max(0, Math.min(100, equity));
  }

  meetsEquityCriteria(property: AttomProperty, minEquityPercent?: number): boolean {
    if (!minEquityPercent) return true;
    const equityPercent = this.calculateEquityPercent(property);
    if (equityPercent === null) return true;
    return equityPercent >= minEquityPercent;
  }

  isOutOfStateOwner(property: AttomProperty): boolean {
    const propertyState = property.address?.countrySubd;
    const mailingState = property.owner?.mailingAddress?.countrySubd;
    if (!propertyState || !mailingState) return false;
    return propertyState !== mailingState;
  }

  filterProperties(properties: AttomProperty[], criteria: AttomPropertyCriteria): AttomProperty[] {
    return properties.filter(property => {
      // State filter
      if (criteria.states?.length) {
        if (!criteria.states.includes(property.address?.countrySubd)) return false;
      }
      
      // Bedrooms filter - only reject if data exists and is below threshold
      if (criteria.minBedrooms) {
        const beds = property.building?.rooms?.beds;
        if (beds !== undefined && beds !== null && beds < criteria.minBedrooms) return false;
      }
      
      // Bathrooms filter - only reject if data exists and is below threshold
      if (criteria.minBathrooms) {
        const baths = property.building?.rooms?.bathsTotal;
        if (baths !== undefined && baths !== null && baths < criteria.minBathrooms) return false;
      }
      
      // Square feet filter - only reject if data exists and is below threshold
      if (criteria.minSqft) {
        const sqft = property.building?.size?.bldgSize || property.building?.size?.grossSize;
        if (sqft !== undefined && sqft !== null && sqft < criteria.minSqft) return false;
      }
      if (criteria.maxSqft) {
        const sqft = property.building?.size?.bldgSize || property.building?.size?.grossSize;
        if (sqft && sqft > criteria.maxSqft) return false;
      }
      
      // Equity filter
      if (!this.meetsEquityCriteria(property, criteria.minEquityPercent)) return false;
      
      // Ownership filters
      if (criteria.ownershipType === 'out-of-state' && !this.isOutOfStateOwner(property)) return false;
      
      // Lot size filter - only reject if data exists and is below threshold
      if (criteria.minLotSize) {
        const lotSize = property.lot?.lotSize1 || property.lot?.lotSize2;
        if (lotSize !== undefined && lotSize !== null && lotSize < criteria.minLotSize) return false;
      }
      
      return true;
    });
  }
}

export function getCriteriaFromEnv(): AttomPropertyCriteria {
  const criteria: AttomPropertyCriteria = {};

  if (process.env.ATTOM_SEARCH_ZIP_CODES) {
    criteria.zipCodes = process.env.ATTOM_SEARCH_ZIP_CODES.split(',').map(z => z.trim());
  }
  if (process.env.ATTOM_SEARCH_STATES) {
    criteria.states = process.env.ATTOM_SEARCH_STATES.split(',').map(s => s.trim());
  }
  if (process.env.ATTOM_SEARCH_CITIES) {
    criteria.cities = process.env.ATTOM_SEARCH_CITIES.split(',').map(c => c.trim());
  }
  if (process.env.ATTOM_MIN_BEDROOMS) {
    criteria.minBedrooms = parseInt(process.env.ATTOM_MIN_BEDROOMS);
  }
  if (process.env.ATTOM_MIN_BATHROOMS) {
    criteria.minBathrooms = parseFloat(process.env.ATTOM_MIN_BATHROOMS);
  }
  if (process.env.ATTOM_MIN_SQFT) {
    criteria.minSqft = parseInt(process.env.ATTOM_MIN_SQFT);
  }
  if (process.env.ATTOM_MAX_SQFT) {
    criteria.maxSqft = parseInt(process.env.ATTOM_MAX_SQFT);
  }
  if (process.env.ATTOM_MAX_PROPERTY_AGE) {
    criteria.maxPropertyAge = parseInt(process.env.ATTOM_MAX_PROPERTY_AGE);
  }
  if (process.env.ATTOM_MIN_EQUITY_PERCENT) {
    criteria.minEquityPercent = parseInt(process.env.ATTOM_MIN_EQUITY_PERCENT);
  }
  if (process.env.ATTOM_OWNERSHIP_TYPE) {
    criteria.ownershipType = process.env.ATTOM_OWNERSHIP_TYPE as any;
  }
  if (process.env.ATTOM_MIN_MARKET_VALUE) {
    criteria.minMarketValue = parseInt(process.env.ATTOM_MIN_MARKET_VALUE);
  }
  if (process.env.ATTOM_MAX_MARKET_VALUE) {
    criteria.maxMarketValue = parseInt(process.env.ATTOM_MAX_MARKET_VALUE);
  }

  return criteria;
}
