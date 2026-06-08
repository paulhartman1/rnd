import { NextResponse } from 'next/server';
import { bulkConvertPropertiesToLeads, getUnimportedProperties } from '@/lib/attom-import';
import { isFeatureEnabled } from '@/lib/features';

/**
 * GET /api/attom/convert
 * View properties available for conversion
 */
export async function GET(request: Request) {
  if (!isFeatureEnabled('attom')) {
    return NextResponse.json({ error: 'Attom feature is not enabled' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const zipcodesParam = searchParams.get('zipcodes');
    const zipcodes = zipcodesParam ? zipcodesParam.split(',').map(z => z.trim()).filter(Boolean) : undefined;
    
    const properties = await getUnimportedProperties(minScore, zipcodes);
    
    return NextResponse.json({
      count: properties.length,
      properties: properties.map(p => ({
        id: p.id,
        address: `${p.address1}, ${p.city}, ${p.state} ${p.zip_code}`,
        score: p.import_score,
        owner: p.owner_full_name || `${p.owner_first_name} ${p.owner_last_name}`,
        is_absentee: p.is_absentee_owner,
        is_corporate: p.is_corporate_owned,
        is_out_of_state: p.is_out_of_state_owner,
        avm_value: p.avm_value,
        equity_percent: p.estimated_equity_percent,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attom/convert
 * Convert properties to leads
 */
export async function POST(request: Request) {
  if (!isFeatureEnabled('attom')) {
    return NextResponse.json({ error: 'Attom feature is not enabled' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const minScore = body.minScore || 70;
    const maxCount = body.maxCount || 100;
    const zipcodes = body.zipcodes;
    
    console.log(`Converting properties with minScore: ${minScore}, maxCount: ${maxCount}, zipcodes: ${zipcodes ? zipcodes.join(', ') : 'all'}`);
    
    const result = await bulkConvertPropertiesToLeads(minScore, maxCount, zipcodes);
    
    return NextResponse.json({
      success: true,
      converted: result.converted,
      leadIds: result.leadIds,
    });
  } catch (error: any) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to convert properties' },
      { status: 500 }
    );
  }
}
