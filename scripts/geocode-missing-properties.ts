/**
 * One-time script to geocode properties missing lat/lng
 * Run with: npx tsx scripts/geocode-missing-properties.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Rate limiting: Nominatim allows 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

async function geocodeAddress(
  street: string,
  city: string,
  state: string,
  postalCode: string
): Promise<{ latitude: number; longitude: number; displayName: string } | { error: string }> {
  try {
    await waitForRateLimit();

    const addressString = [street, city, state, postalCode].filter(Boolean).join(', ');
    const params = new URLSearchParams({
      q: addressString,
      format: 'json',
      addressdetails: '1',
      limit: '1',
      countrycodes: 'us',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'RushNDush-CRM/1.0',
        },
      }
    );

    if (!response.ok) {
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return { error: 'No results found' };
    }

    const result = data[0];

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  console.log('Fetching properties without geocoding...');

  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, street_address, city, state, postal_code, lead_id, leads(full_name, source_id, sources(name))')
    .is('latitude', null)
    .is('longitude', null);

  if (error) {
    console.error('Error fetching properties:', error);
    process.exit(1);
  }

  if (!properties || properties.length === 0) {
    console.log('No properties need geocoding!');
    return;
  }

  console.log(`Found ${properties.length} properties to geocode\n`);

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    console.log(`[${i + 1}/${properties.length}] Geocoding property ${property.id}...`);
    console.log(`  Address: ${property.street_address}, ${property.city}, ${property.state} ${property.postal_code}`);

    const result = await geocodeAddress(
      property.street_address,
      property.city || '',
      property.state || '',
      property.postal_code || ''
    );

    if ('error' in result) {
      console.log(`  ❌ Failed: ${result.error}\n`);
      continue;
    }

    // Update property with geocoding results
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        latitude: result.latitude,
        longitude: result.longitude,
        geocoded_at: new Date().toISOString(),
        geocode_source: 'nominatim',
      })
      .eq('id', property.id);

    if (updateError) {
      console.log(`  ❌ Update failed: ${updateError.message}\n`);
    } else {
      console.log(`  ✅ Success: ${result.displayName}`);
      console.log(`     Coordinates: ${result.latitude}, ${result.longitude}\n`);
    }
  }

  console.log('✨ Geocoding complete!');
}

main().catch(console.error);
