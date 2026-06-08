import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isFeatureEnabled } from '@/lib/features';

/**
 * GET /api/attom/zipcodes
 * Get list of unique zipcodes from imported Attom properties
 */
export async function GET() {
  if (!isFeatureEnabled('attom')) {
    return NextResponse.json({ error: 'Attom feature is not enabled' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Unable to create admin Supabase client');

    // Get distinct zipcodes from attom_properties table
    const { data, error } = await supabase
      .from('attom_properties')
      .select('zip_code')
      .not('zip_code', 'is', null);

    if (error) throw error;

    // Extract unique zipcodes and sort them
    const uniqueZipcodes = Array.from(
      new Set(data.map(row => row.zip_code))
    ).sort();

    return NextResponse.json({ zipcodes: uniqueZipcodes });
  } catch (error: any) {
    console.error('Error fetching zipcodes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch zipcodes' },
      { status: 500 }
    );
  }
}
