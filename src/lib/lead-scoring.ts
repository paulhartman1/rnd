/**
 * Lead Scoring System
 * Provides configurable scoring for property leads based on various criteria
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { AttomAPIClient, AttomProperty } from './attom';
import { cache, cached } from './cache';

// TypeScript Interfaces
export interface EquityRange {
  min: number;
  max: number;
  points: number;
  enabled: boolean;
  description?: string;
}

export interface ScoringCriteria {
  absentee_owner?: {
    points: number;
    enabled: boolean;
    description?: string;
  };
  corporate_owner?: {
    points: number;
    enabled: boolean;
    description?: string;
  };
  out_of_state_owner?: {
    points: number;
    enabled: boolean;
    description?: string;
  };
  equity_ranges?: EquityRange[];
  property_age?: {
    min_years: number;
    points: number;
    enabled: boolean;
    description?: string;
  };
  // Extensible: add new criteria here as needed
}

export interface ScoringConfig {
  id: string;
  config_name: string;
  description?: string;
  is_active: boolean;
  base_score: number;
  criteria: ScoringCriteria;
  created_at: string;
  updated_at: string;
}

// Cache key for active config
const ACTIVE_CONFIG_CACHE_KEY = 'lead_scoring:active_config';
const CACHE_TTL = 300; // 5 minutes

/**
 * Fetch the active scoring configuration
 * Uses caching to avoid repeated database queries
 */
export async function getScoringConfig(): Promise<ScoringConfig | null> {
  return await cached(ACTIVE_CONFIG_CACHE_KEY, CACHE_TTL, async () => {
    const supabase = createAdminClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('lead_scoring_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return data as ScoringConfig;
  });
}

/**
 * Calculate score for a property using the provided (or default) configuration
 */
export function calculateScore(
  property: AttomProperty,
  client: AttomAPIClient,
  config?: ScoringConfig | null
): number {
  // Use hardcoded defaults if no config provided (backward compatibility)
  if (!config) {
    return calculateScoreWithDefaults(property, client);
  }

  let score = config.base_score;
  const criteria = config.criteria;

  // Absentee owner
  if (criteria.absentee_owner?.enabled && property.owner?.absenteeIndicator === 'Y') {
    score += criteria.absentee_owner.points;
  }

  // Corporate owner
  if (criteria.corporate_owner?.enabled && property.owner?.corporateIndicator === 'Y') {
    score += criteria.corporate_owner.points;
  }

  // Out of state owner
  if (criteria.out_of_state_owner?.enabled && client.isOutOfStateOwner(property)) {
    score += criteria.out_of_state_owner.points;
  }

  // Equity ranges
  if (criteria.equity_ranges && criteria.equity_ranges.length > 0) {
    const equityPercent = client.calculateEquityPercent(property);
    if (equityPercent !== null) {
      for (const range of criteria.equity_ranges) {
        if (range.enabled && equityPercent >= range.min && equityPercent <= range.max) {
          score += range.points;
          break; // Only apply first matching range
        }
      }
    }
  }

  // Property age
  if (criteria.property_age?.enabled) {
    const yearBuilt = property.building?.construction?.yearBuilt;
    if (yearBuilt) {
      const age = new Date().getFullYear() - yearBuilt;
      if (age >= criteria.property_age.min_years) {
        score += criteria.property_age.points;
      }
    }
  }

  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Fallback: Calculate score using hardcoded defaults (original logic)
 * Used for backward compatibility when no config exists
 */
function calculateScoreWithDefaults(property: AttomProperty, client: AttomAPIClient): number {
  let score = 50;

  if (property.owner?.absenteeIndicator === 'Y') score += 15;
  if (property.owner?.corporateIndicator === 'Y') score += 10;
  if (client.isOutOfStateOwner(property)) score += 10;

  const equityPercent = client.calculateEquityPercent(property);
  if (equityPercent !== null) {
    if (equityPercent >= 50) score += 15;
    else if (equityPercent >= 30) score += 10;
    else if (equityPercent < 20) score -= 10;
  }

  const yearBuilt = property.building?.construction?.yearBuilt;
  if (yearBuilt && new Date().getFullYear() - yearBuilt >= 40) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Validate scoring configuration structure
 */
export function validateScoringConfig(config: Partial<ScoringConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.config_name || config.config_name.trim() === '') {
    errors.push('Configuration name is required');
  }

  if (config.base_score !== undefined) {
    if (config.base_score < 0 || config.base_score > 100) {
      errors.push('Base score must be between 0 and 100');
    }
  }

  if (config.criteria) {
    const criteria = config.criteria;

    // Validate point values
    const validatePoints = (points: number | undefined, field: string) => {
      if (points !== undefined && (points < -100 || points > 100)) {
        errors.push(`${field} points must be between -100 and 100`);
      }
    };

    if (criteria.absentee_owner) {
      validatePoints(criteria.absentee_owner.points, 'Absentee owner');
    }

    if (criteria.corporate_owner) {
      validatePoints(criteria.corporate_owner.points, 'Corporate owner');
    }

    if (criteria.out_of_state_owner) {
      validatePoints(criteria.out_of_state_owner.points, 'Out of state owner');
    }

    if (criteria.property_age) {
      validatePoints(criteria.property_age.points, 'Property age');
      if (criteria.property_age.min_years !== undefined && criteria.property_age.min_years < 0) {
        errors.push('Property age minimum years must be positive');
      }
    }

    // Validate equity ranges
    if (criteria.equity_ranges) {
      criteria.equity_ranges.forEach((range, index) => {
        if (range.min < 0 || range.min > 100) {
          errors.push(`Equity range ${index + 1}: min must be between 0 and 100`);
        }
        if (range.max < 0 || range.max > 100) {
          errors.push(`Equity range ${index + 1}: max must be between 0 and 100`);
        }
        if (range.min > range.max) {
          errors.push(`Equity range ${index + 1}: min cannot be greater than max`);
        }
        validatePoints(range.points, `Equity range ${index + 1}`);
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Set a configuration as active (and deactivate all others atomically)
 */
export async function setActiveScoringConfig(configId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, error: 'Unable to create admin client' };
  }

  try {
    // Verify config exists
    const { data: config, error: fetchError } = await supabase
      .from('lead_scoring_config')
      .select('id')
      .eq('id', configId)
      .single();

    if (fetchError || !config) {
      return { success: false, error: 'Configuration not found' };
    }

    // Deactivate all configs
    await supabase
      .from('lead_scoring_config')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    // Activate the specified config
    const { error: updateError } = await supabase
      .from('lead_scoring_config')
      .update({ is_active: true })
      .eq('id', configId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Clear cache
    await cache.delete(ACTIVE_CONFIG_CACHE_KEY);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Create a new scoring configuration
 */
export async function createScoringConfig(
  name: string,
  criteria: ScoringCriteria,
  options: {
    description?: string;
    baseScore?: number;
    setAsActive?: boolean;
  } = {}
): Promise<{ success: boolean; config?: ScoringConfig; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, error: 'Unable to create admin client' };
  }

  const newConfig: Partial<ScoringConfig> = {
    config_name: name,
    description: options.description,
    base_score: options.baseScore ?? 50,
    criteria,
    is_active: options.setAsActive ?? false,
  };

  // Validate before creating
  const validation = validateScoringConfig(newConfig);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  try {
    // If setting as active, deactivate others first
    if (options.setAsActive) {
      await supabase
        .from('lead_scoring_config')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data, error } = await supabase
      .from('lead_scoring_config')
      .insert(newConfig)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Clear cache if we set this as active
    if (options.setAsActive) {
      await cache.delete(ACTIVE_CONFIG_CACHE_KEY);
    }

    return { success: true, config: data as ScoringConfig };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Recalculate scores for existing properties using the active configuration
 */
export async function recalculatePropertyScores(
  filters?: {
    minScore?: number;
    maxScore?: number;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, updatedCount: 0, error: 'Unable to create admin client' };
  }

  try {
    const config = await getScoringConfig();
    if (!config) {
      return { success: false, updatedCount: 0, error: 'No active scoring configuration found' };
    }

    // Build query with filters
    let query = supabase.from('attom_properties').select('*');

    if (filters?.minScore !== undefined) {
      query = query.gte('import_score', filters.minScore);
    }
    if (filters?.maxScore !== undefined) {
      query = query.lte('import_score', filters.maxScore);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data: properties, error: fetchError } = await query;

    if (fetchError || !properties) {
      return { success: false, updatedCount: 0, error: fetchError?.message || 'Failed to fetch properties' };
    }

    const client = new AttomAPIClient();
    let updatedCount = 0;

    // Update in batches
    for (const property of properties) {
      const newScore = calculateScore(property.raw_data, client, config);

      const { error: updateError } = await supabase
        .from('attom_properties')
        .update({ import_score: newScore })
        .eq('id', property.id);

      if (!updateError) {
        updatedCount++;
      }
    }

    return { success: true, updatedCount };
  } catch (error: any) {
    return { success: false, updatedCount: 0, error: error.message || 'Unknown error' };
  }
}
