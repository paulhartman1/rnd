/**
 * Property Valuation Repository Tests
 * 
 * Basic tests for valuation CRUD operations.
 * Run with: npm test src/lib/valuation/repository.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { PropertyValuationRepository } from './repository';
import type { CreatePropertyValuationInput } from './types';

// Note: These tests require a Supabase project
// Set SUPABASE_URL and SUPABASE_KEY environment variables

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

describe('PropertyValuationRepository', () => {
  let repository: PropertyValuationRepository;
  let testPropertyId: string;
  let testValuationId: string;

  beforeAll(() => {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    repository = new PropertyValuationRepository(supabase);

    // You'll need an actual property ID from your database
    // Or create one in beforeAll
    testPropertyId = 'test-property-id'; // Replace with real ID
  });

  describe('create', () => {
    it('should create a new property valuation', async () => {
      const input: CreatePropertyValuationInput = {
        property_id: testPropertyId,
        value: 450000,
        valuation_purpose: 'as_is_market_value',
        valuation_method: 'manual_entry',
        valuation_source: 'Test Entry',
        confidence_score: 85,
        comparable_count: 10,
        notes: 'Test valuation',
      };

      const valuation = await repository.create(input);

      expect(valuation.id).toBeDefined();
      expect(valuation.property_id).toBe(testPropertyId);
      expect(valuation.value).toBe(450000);
      expect(valuation.valuation_purpose).toBe('as_is_market_value');

      testValuationId = valuation.id;
    });
  });

  describe('getById', () => {
    it('should retrieve a valuation by ID', async () => {
      const valuation = await repository.getById(testValuationId);

      expect(valuation).not.toBeNull();
      expect(valuation?.id).toBe(testValuationId);
      expect(valuation?.value).toBe(450000);
    });

    it('should return null for non-existent ID', async () => {
      const valuation = await repository.getById('non-existent-id');
      expect(valuation).toBeNull();
    });
  });

  describe('getByPropertyId', () => {
    it('should retrieve all valuations for a property', async () => {
      const valuations = await repository.getByPropertyId(testPropertyId);

      expect(Array.isArray(valuations)).toBe(true);
      expect(valuations.length).toBeGreaterThan(0);
      expect(valuations[0].property_id).toBe(testPropertyId);
    });
  });

  describe('update', () => {
    it('should update valuation notes', async () => {
      const updated = await repository.update(testValuationId, {
        notes: 'Updated test notes',
      });

      expect(updated.notes).toBe('Updated test notes');
    });
  });

  describe('setAsCurrent', () => {
    it('should set a valuation as current for its property', async () => {
      await repository.setAsCurrent(testValuationId);

      const current = await repository.getCurrentForProperty(testPropertyId);
      expect(current?.id).toBe(testValuationId);
    });
  });

  describe('getSummariesForProperty', () => {
    it('should return valuation summaries with correct format', async () => {
      const summaries = await repository.getSummariesForProperty(
        testPropertyId,
        testValuationId
      );

      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries.length).toBeGreaterThan(0);

      const summary = summaries[0];
      expect(summary.id).toBeDefined();
      expect(summary.value).toBeDefined();
      expect(summary.purposeLabel).toBeDefined();
      expect(typeof summary.isCurrent).toBe('boolean');
    });
  });

  afterAll(async () => {
    // Optional: Clean up test data
    // Note: You may want to keep test data or clean it up manually
  });
});
