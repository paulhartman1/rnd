import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { geocodeAddresses } from "@/lib/geocoding";

/**
 * POST /api/admin/properties/geocode
 * 
 * Geocodes properties that don't have coordinates yet.
 * Supports batch processing with rate limiting.
 * 
 * Request body:
 * {
 *   "propertyIds": ["uuid1", "uuid2", ...],  // Optional: specific properties to geocode
 *   "limit": 100                              // Optional: max properties to geocode (default: 100)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "geocoded": 45,
 *   "errors": 5,
 *   "total": 50,
 *   "details": {
 *     "results": [...],
 *     "errors": [...]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json().catch(() => ({}));
    
    const { propertyIds, limit = 100 } = body;

    // Build query to fetch properties needing geocoding
    let query = supabase
      .from('properties')
      .select('id, street_address, city, state, postal_code')
      .is('latitude', null)
      .not('street_address', 'is', null)
      .limit(limit);

    // Filter by specific property IDs if provided
    if (propertyIds && Array.isArray(propertyIds) && propertyIds.length > 0) {
      query = query.in('id', propertyIds);
    }

    const { data: properties, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching properties:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch properties', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        success: true,
        geocoded: 0,
        errors: 0,
        total: 0,
        message: 'No properties need geocoding',
      });
    }

    // Prepare addresses for geocoding
    const addresses = properties.map(p => ({
      id: p.id,
      street: p.street_address || '',
      city: p.city || '',
      state: p.state || '',
      postalCode: p.postal_code || '',
    }));

    // Geocode all addresses
    console.log(`Geocoding ${addresses.length} properties...`);
    const { results, errors } = await geocodeAddresses(addresses);

    // Update properties with geocoding results
    const updates = results.map(result => ({
      id: result.id,
      latitude: result.latitude,
      longitude: result.longitude,
      geocoded_at: new Date().toISOString(),
      geocode_source: result.source,
    }));

    if (updates.length > 0) {
      // Batch update all properties at once
      const { error: updateError } = await supabase
        .from('properties')
        .upsert(updates, { onConflict: 'id' });

      if (updateError) {
        console.error('Error updating properties:', updateError);
        return NextResponse.json(
          { 
            error: 'Failed to update properties with coordinates',
            details: updateError.message,
            partialResults: {
              geocoded: results.length,
              errors: errors.length,
            }
          },
          { status: 500 }
        );
      }
    }

    console.log(`Geocoding complete: ${results.length} successful, ${errors.length} failed`);

    return NextResponse.json({
      success: true,
      geocoded: results.length,
      errors: errors.length,
      total: properties.length,
      details: {
        results: results.map(r => ({
          id: r.id,
          latitude: r.latitude,
          longitude: r.longitude,
          displayName: r.displayName,
        })),
        errors: errors.map(e => ({
          id: e.id,
          error: e.error,
          address: e.address,
        })),
      },
    });

  } catch (error) {
    console.error('Geocoding API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/properties/geocode
 * 
 * Returns statistics about geocoding status
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get total properties
    const { count: totalProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    // Get geocoded properties
    const { count: geocodedProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Get properties needing geocoding
    const { count: needsGeocoding } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .is('latitude', null)
      .not('street_address', 'is', null);

    return NextResponse.json({
      success: true,
      stats: {
        total: totalProperties || 0,
        geocoded: geocodedProperties || 0,
        needsGeocoding: needsGeocoding || 0,
        percentage: totalProperties 
          ? Math.round(((geocodedProperties || 0) / totalProperties) * 100)
          : 0,
      },
    });

  } catch (error) {
    console.error('Geocoding stats error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get geocoding stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
