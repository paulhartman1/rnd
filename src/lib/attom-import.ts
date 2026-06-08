/**
 * Attom Property Import Service
 * Handles importing properties from Attom API and converting them to leads
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { AttomAPIClient, AttomProperty, AttomPropertyCriteria, getCriteriaFromEnv } from './attom';
import { requireFeature } from './features';
import { getScoringConfig, calculateScore, ScoringConfig } from './lead-scoring';

export interface ImportResult {
  propertiesFound: number;
  propertiesImported: number;
  propertiesSkipped: number;
  propertiesUpdated: number;
  errors: string[];
}

export interface ImportOptions {
  criteria?: AttomPropertyCriteria;
  maxProperties?: number;
  skipExisting?: boolean;
}

/**
 * Calculate import score using configurable scoring system
 * Falls back to hardcoded defaults if no config is available
 */
function calculateImportScore(property: AttomProperty, client: AttomAPIClient, config?: ScoringConfig | null): number {
  return calculateScore(property, client, config);
}

interface PropertyRecord {
  attom_id: string | null;
  apn: string | null;
  fips: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip_code: string;
  property_type: string | null;
  property_indicator: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  lot_size_sqft: number | null;
  lot_size_acres: number | null;
  year_built: number | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_full_name: string | null;
  is_corporate_owned: boolean;
  is_absentee_owner: boolean;
  is_out_of_state_owner: boolean;
  mailing_address1: string | null;
  mailing_city: string | null;
  mailing_state: string | null;
  mailing_zip_code: string | null;
  assessed_value: number | null;
  market_value: number | null;
  avm_value: number | null;
  avm_confidence_score: number | null;
  avm_high: number | null;
  avm_low: number | null;
  tax_amount: number | null;
  last_sale_date: string | null;
  last_sale_price: number | null;
  last_sale_type: string | null;
  estimated_equity_percent: number | null;
  import_score: number;
  enrichment_phase: number;
  raw_data: any;
}

function attomPropertyToRecord(property: AttomProperty, client: AttomAPIClient, phase: number, config?: ScoringConfig | null): Partial<PropertyRecord> {
  const record: Partial<PropertyRecord> = {
    enrichment_phase: phase,
    raw_data: property,
  };

  // Always include identifiers and address
  record.attom_id = property.identifier?.attomId?.toString() || null;
  record.apn = property.identifier?.apn || null;
  record.address1 = property.address.line1;
  record.address2 = property.address.line2 || null;
  record.city = property.address.locality;
  record.state = property.address.countrySubd;
  record.zip_code = property.address.postal1;

  // Phase 1 (snapshot): property details
  if (phase >= 1) {
    record.bedrooms = property.building?.rooms?.beds || null;
    record.bathrooms = property.building?.rooms?.bathsTotal || null;
    record.square_feet = property.building?.size?.bldgSize || property.building?.size?.grossSize || null;
    record.lot_size_sqft = property.lot?.lotSize2 || null;
    record.lot_size_acres = property.lot?.lotSize1 || null;
    record.year_built = property.building?.construction?.yearBuilt || null;
    
    // Initialize boolean fields with defaults for phase 1
    record.is_corporate_owned = false;
    record.is_absentee_owner = false;
    record.is_out_of_state_owner = false;
    
    // Check for summary data (only in snapshot/detail endpoints)
    const summary = (property as any).summary;
    if (summary) {
      record.property_type = summary.proptype || null;
      record.property_indicator = summary.propIndicator ? parseInt(summary.propIndicator) : null;
      record.is_absentee_owner = summary.absenteeInd === 'ABSENTEE OWNER';
    }
  }

  // Phase 2 (detailowner): ownership
  if (phase >= 2 && property.owner) {
    record.owner_first_name = property.owner.owner1?.firstNameAndMI || null;
    record.owner_last_name = property.owner.owner1?.lastName || null;
    record.owner_full_name = property.owner.owner1?.fullName || null;
    record.is_corporate_owned = property.owner.corporateIndicator === 'Y';
    record.is_out_of_state_owner = client.isOutOfStateOwner(property);
    record.mailing_address1 = property.owner.mailingAddress?.line1 || null;
    record.mailing_city = property.owner.mailingAddress?.locality || null;
    record.mailing_state = property.owner.mailingAddress?.countrySubd || null;
    record.mailing_zip_code = property.owner.mailingAddress?.postal1 || null;
  }

  // Phase 3 (avm/sale): valuation and sale
  if (phase >= 3) {
    if (property.assessment) {
      record.assessed_value = property.assessment.assessed?.assdTtlValue || null;
      record.market_value = property.assessment.market?.mktTtlValue || null;
      const tax = (property.assessment as any).tax;
      if (tax) {
        record.tax_amount = tax.taxamt || null;
      }
    }
    if (property.avm) {
      record.avm_value = property.avm.amount?.value || null;
      const avmAmount = property.avm.amount as any;
      if (avmAmount) {
        record.avm_confidence_score = avmAmount.scr || null;
        record.avm_high = avmAmount.high || null;
        record.avm_low = avmAmount.low || null;
      }
    }
    if (property.sale) {
      record.last_sale_date = property.sale.saleTransDate ? new Date(property.sale.saleTransDate).toISOString() : null;
      record.last_sale_price = property.sale.amount?.saleAmt || null;
      const saleAmount = property.sale.amount as any;
      if (saleAmount) {
        record.last_sale_type = saleAmount.saletranstype || null;
      }
    }
    record.estimated_equity_percent = client.calculateEquityPercent(property);
  }

  // Calculate score with available data
  record.import_score = calculateImportScore(property, client, config);

  return record;
}

export async function importAttomProperties(options: ImportOptions = {}): Promise<ImportResult> {
  requireFeature('attom');

  const result: ImportResult = {
    propertiesFound: 0,
    propertiesImported: 0,
    propertiesSkipped: 0,
    propertiesUpdated: 0,
    errors: [],
  };

  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Unable to create admin Supabase client');
    const client = new AttomAPIClient();
    const criteria = options.criteria || getCriteriaFromEnv();
    const maxProperties = options.maxProperties || 1000;

    // Load scoring config once at start of import
    const scoringConfig = await getScoringConfig();
    if (scoringConfig) {
      console.log('Using scoring config:', scoringConfig.config_name);
    } else {
      console.log('No active scoring config found, using hardcoded defaults');
    }

    console.log('Starting 3-phase Attom property import with criteria:', criteria);

    // PHASE 1: Snapshot - Discovery with property details
    console.log('Phase 1: Fetching snapshot data (property details, absentee indicator)');
    let page = 1;
    let hasMore = true;
    let totalFetched = 0;

    while (hasMore && totalFetched < maxProperties) {
      try {
        const response = await client.searchSnapshot(criteria, page, 100);
        if (page === 1) result.propertiesFound = response.total;
        hasMore = response.hasMore && totalFetched + response.properties.length < maxProperties;

        console.log(`Phase 1 Page ${page}: Found ${response.properties.length} properties, total: ${response.total}`);

        for (const property of response.properties) {
          try {
            const record = attomPropertyToRecord(property, client, 1, scoringConfig);

            const { data: existing } = await supabase
              .from('attom_properties')
              .select('id')
              .eq('attom_id', record.attom_id)
              .single();

            if (existing) {
              if (options.skipExisting) {
                result.propertiesSkipped++;
                continue;
              }
              const { error: updateError } = await supabase.from('attom_properties').update(record).eq('id', existing.id);
              if (updateError) {
                const errorMsg = `Phase 1 - Error updating property ${property.address.line1}: ${updateError.message}`;
                console.error(errorMsg, updateError);
                result.errors.push(errorMsg);
              } else {
                result.propertiesUpdated++;
              }
            } else {
              const { error: insertError } = await supabase.from('attom_properties').insert(record);
              if (insertError) {
                const errorMsg = `Phase 1 - Error inserting property ${property.address.line1}: ${insertError.message}`;
                console.error(errorMsg, insertError);
                result.errors.push(errorMsg);
              } else {
                result.propertiesImported++;
              }
            }
          } catch (error) {
            const errorMsg = `Phase 1 - Error importing property ${property.address.line1}: ${error}`;
            console.error(errorMsg);
            result.errors.push(errorMsg);
          }
        }

        totalFetched += response.properties.length;
        page++;

        if (hasMore) await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = `Phase 1 - Error fetching page ${page}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
        break;
      }
    }

    console.log(`Phase 1 complete. Imported: ${result.propertiesImported}, Updated: ${result.propertiesUpdated}`);

    // PHASE 2: DetailOwner - Enrich with ownership data
    console.log('Phase 2: Fetching owner data (names, mailing addresses, corporate indicator)');
    page = 1;
    hasMore = true;
    totalFetched = 0;

    while (hasMore && totalFetched < maxProperties) {
      try {
        const response = await client.searchDetailOwner(criteria, page, 100);
        hasMore = response.hasMore && totalFetched + response.properties.length < maxProperties;

        console.log(`Phase 2 Page ${page}: Enriching ${response.properties.length} properties with owner data`);

        for (const property of response.properties) {
          try {
            const attomId = property.identifier?.attomId?.toString();
            if (!attomId) continue;

            const record = attomPropertyToRecord(property, client, 2, scoringConfig);

            const { error: updateError } = await supabase
              .from('attom_properties')
              .update(record)
              .eq('attom_id', attomId);

            if (updateError) {
              result.errors.push(`Phase 2 - Error updating ${attomId}: ${updateError.message}`);
            }
          } catch (error) {
            const errorMsg = `Phase 2 - Error enriching property ${property.address.line1}: ${error}`;
            console.error(errorMsg);
            result.errors.push(errorMsg);
          }
        }

        totalFetched += response.properties.length;
        page++;

        if (hasMore) await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = `Phase 2 - Error fetching page ${page}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
        break;
      }
    }

    console.log('Phase 2 complete.');

    // PHASE 3: AVM + Sale - Enrich with valuation and sale data
    console.log('Phase 3: Fetching AVM and sale data (valuations, confidence, sale history)');
    
    // Phase 3a: AVM data
    page = 1;
    hasMore = true;
    totalFetched = 0;

    while (hasMore && totalFetched < maxProperties) {
      try {
        const response = await client.searchAVM(criteria, page, 100);
        hasMore = response.hasMore && totalFetched + response.properties.length < maxProperties;

        console.log(`Phase 3a Page ${page}: Enriching ${response.properties.length} properties with AVM data`);

        for (const property of response.properties) {
          try {
            const attomId = property.identifier?.attomId?.toString();
            if (!attomId) continue;

            const record = attomPropertyToRecord(property, client, 3, scoringConfig);

            await supabase
              .from('attom_properties')
              .update(record)
              .eq('attom_id', attomId);
          } catch (error) {
            result.errors.push(`Phase 3a - Error enriching ${property.address.line1}: ${error}`);
          }
        }

        totalFetched += response.properties.length;
        page++;

        if (hasMore) await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = `Phase 3a - Error fetching page ${page}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
        break;
      }
    }

    // Phase 3b: Sale data
    page = 1;
    hasMore = true;
    totalFetched = 0;

    while (hasMore && totalFetched < maxProperties) {
      try {
        const response = await client.searchSales(criteria, page, 100);
        hasMore = response.hasMore && totalFetched + response.properties.length < maxProperties;

        console.log(`Phase 3b Page ${page}: Enriching ${response.properties.length} properties with sale data`);

        for (const property of response.properties) {
          try {
            const attomId = property.identifier?.attomId?.toString();
            if (!attomId) continue;

            const record = attomPropertyToRecord(property, client, 3, scoringConfig);

            await supabase
              .from('attom_properties')
              .update(record)
              .eq('attom_id', attomId);
          } catch (error) {
            result.errors.push(`Phase 3b - Error enriching ${property.address.line1}: ${error}`);
          }
        }

        totalFetched += response.properties.length;
        page++;

        if (hasMore) await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = `Phase 3b - Error fetching page ${page}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
        break;
      }
    }

    console.log('Phase 3 complete.');
    console.log('All phases complete:', result);
    return result;
  } catch (error) {
    console.error('Fatal error during import:', error);
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
}

export async function getUnimportedProperties(minScore?: number, zipcodes?: string[]) {
  requireFeature('attom');
  const supabase = createAdminClient();
  if (!supabase) throw new Error('Unable to create admin Supabase client');

  let query = supabase
    .from('attom_properties')
    .select('*')
    .or('imported_as_lead.eq.false,imported_as_lead.is.null');

  if (minScore !== undefined) {
    query = query.gte('import_score', minScore);
  }

  if (zipcodes && zipcodes.length > 0) {
    query = query.in('zip_code', zipcodes);
  }

  const { data, error } = await query.order('import_score', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function convertPropertyToLead(propertyId: string): Promise<string> {
  requireFeature('attom');
  const supabase = createAdminClient();
  if (!supabase) throw new Error('Unable to create admin Supabase client');

  console.log(`Converting property ${propertyId} to lead...`);

  const { data: property, error: fetchError } = await supabase
    .from('attom_properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (fetchError || !property) {
    console.error(`Error fetching property ${propertyId}:`, fetchError);
    throw new Error('Property not found');
  }
  if (property.imported_as_lead) {
    console.log(`Property ${propertyId} already converted to lead`);
    throw new Error('Property already converted to lead');
  }

  console.log(`Property data: ${property.address1}, ${property.city}, ${property.state} ${property.zip_code}`);

  // Get Attom API source
  const { data: source } = await supabase
    .from('sources')
    .select('id')
    .eq('name', 'Attom API')
    .single();

  if (!source) {
    console.error('Attom API source not found in sources table');
    throw new Error('Attom API source not found');
  }

  console.log(`Using source_id: ${source.id}`);

  const leadData = {
    full_name: property.owner_full_name || `${property.owner_first_name || 'Unknown'} ${property.owner_last_name || 'Owner'}`.trim(),
    email: 'unknown@placeholder.local', // Placeholder to satisfy contact_required constraint
    source_id: source.id,
    status: 'new',
    street_address: property.address1,
    city: property.city,
    state: property.state,
    postal_code: property.zip_code,
    owner_notes: `Import Score: ${property.import_score}\nAbsentee: ${property.is_absentee_owner}\nOut of State: ${property.is_out_of_state_owner}\nCorporate: ${property.is_corporate_owned}\nEquity: ${property.estimated_equity_percent}%\nEstimated Value: $${property.avm_value || property.market_value || 'N/A'}`,
  };

  console.log('Inserting lead with data:', leadData);

  const { data: lead, error: leadError} = await supabase
    .from('leads')
    .insert(leadData)
    .select()
    .single();

  if (leadError) {
    console.error('Error inserting lead:', leadError);
    throw leadError;
  }

  console.log(`Successfully created lead ${lead.id}`);

  await supabase
    .from('attom_properties')
    .update({ imported_as_lead: true, imported_lead_id: lead.id })
    .eq('id', propertyId);

  console.log(`Updated property ${propertyId} with lead reference`);

  return lead.id;
}

export async function bulkConvertPropertiesToLeads(minScore: number = 70, maxCount: number = 100, zipcodes?: string[]) {
  requireFeature('attom');

  const properties = await getUnimportedProperties(minScore, zipcodes);
  const toConvert = properties.slice(0, maxCount);
  const leadIds: string[] = [];

  for (const property of toConvert) {
    try {
      const leadId = await convertPropertyToLead(property.id);
      leadIds.push(leadId);
    } catch (error) {
      console.error(`Error converting property ${property.id}:`, error);
    }
  }

  return { converted: leadIds.length, leadIds };
}
