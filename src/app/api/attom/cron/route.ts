import { NextResponse } from 'next/server';
import { importAttomProperties, bulkConvertPropertiesToLeads } from '@/lib/attom-import';
import { isFeatureEnabled } from '@/lib/features';

export async function GET(request: Request) {
  if (!isFeatureEnabled('attom')) {
    return NextResponse.json({ error: 'Attom feature is not enabled' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  
  // TODO: Re-enable auth after testing
  // if (cronSecret && secret !== cronSecret) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    const maxProperties = parseInt(searchParams.get('maxProperties') || '100');
    const minScore = parseInt(searchParams.get('minScore') || '70');
    const autoConvert = searchParams.get('autoConvert') === 'true';
    const noCache = searchParams.get('noCache') === 'true';
    
    // Build criteria from query params
    const criteria: any = {};
    const zipCodes = searchParams.get('zipCodes');
    if (zipCodes) criteria.zipCodes = zipCodes.split(',').map(z => z.trim());
    
    const states = searchParams.get('states');
    if (states) criteria.states = states.split(',').map(s => s.trim());
    
    const minBeds = searchParams.get('minBeds');
    if (minBeds) criteria.minBedrooms = parseInt(minBeds);
    
    const minSqft = searchParams.get('minSqft');
    if (minSqft) criteria.minSqft = parseInt(minSqft);
    
    const maxSqft = searchParams.get('maxSqft');
    if (maxSqft) criteria.maxSqft = parseInt(maxSqft);

    console.log('Starting Attom cron job', { maxProperties, minScore, autoConvert, noCache, criteria });

    // Clear cache if requested (useful during testing)
    if (noCache) {
      const { cache } = await import('@/lib/cache');
      await cache.clear();
    }

    const importResult = await importAttomProperties({ 
      maxProperties, 
      skipExisting: !noCache, // If noCache is true, don't skip existing (re-import)
      criteria: Object.keys(criteria).length > 0 ? criteria : undefined,
    });
    console.log('Import complete:', importResult);

    let convertResult = null;
    if (autoConvert) {
      convertResult = await bulkConvertPropertiesToLeads(minScore, maxProperties);
      console.log('Conversion complete:', convertResult);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      import: importResult,
      convert: convertResult,
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Cron job failed', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const params = new URLSearchParams({
    maxProperties: body.maxProperties?.toString() || '100',
    minScore: body.minScore?.toString() || '70',
    autoConvert: body.autoConvert?.toString() || 'false',
    secret: body.secret || '',
  });

  const newUrl = new URL(request.url);
  newUrl.search = params.toString();
  return GET(new Request(newUrl.toString()));
}
