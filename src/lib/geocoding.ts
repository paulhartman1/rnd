/**
 * Geocoding Service using Nominatim (OpenStreetMap)
 * Free service with rate limit of 1 request per second
 * See: https://nominatim.org/release-docs/develop/api/Search/
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
  source: string;
}

export interface GeocodeError {
  error: string;
  address: string;
}

// Rate limiting: Nominatim allows 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second in milliseconds

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Geocode a single address using Nominatim
 */
export async function geocodeAddress(
  street: string,
  city: string,
  state: string,
  postalCode: string
): Promise<GeocodeResult | GeocodeError> {
  try {
    // Wait for rate limit
    await waitForRateLimit();

    // Build address string
    const addressParts = [street, city, state, postalCode].filter(Boolean);
    const addressString = addressParts.join(', ');

    if (!addressString.trim()) {
      return { error: 'Invalid address: all fields are empty', address: '' };
    }

    // Nominatim API endpoint
    const params = new URLSearchParams({
      q: addressString,
      format: 'json',
      addressdetails: '1',
      limit: '1',
      countrycodes: 'us', // Limit to US addresses
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'RushNDush-CRM/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      return {
        error: `Geocoding API error: ${response.status} ${response.statusText}`,
        address: addressString,
      };
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return {
        error: 'No results found for address',
        address: addressString,
      };
    }

    const result = data[0];

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      source: 'nominatim',
    };
  } catch (error) {
    const addressString = [street, city, state, postalCode].filter(Boolean).join(', ');
    return {
      error: error instanceof Error ? error.message : 'Unknown geocoding error',
      address: addressString,
    };
  }
}

/**
 * Geocode multiple addresses with rate limiting
 * Returns results and errors separately
 */
export async function geocodeAddresses(
  addresses: Array<{
    id: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<{
  results: Array<{ id: string } & GeocodeResult>;
  errors: Array<{ id: string } & GeocodeError>;
}> {
  const results: Array<{ id: string } & GeocodeResult> = [];
  const errors: Array<{ id: string } & GeocodeError> = [];

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    
    if (onProgress) {
      onProgress(i + 1, addresses.length);
    }

    const result = await geocodeAddress(
      address.street,
      address.city,
      address.state,
      address.postalCode
    );

    if ('error' in result) {
      errors.push({ id: address.id, ...result });
    } else {
      results.push({ id: address.id, ...result });
    }
  }

  return { results, errors };
}
