# Map Integration Guide

## Changes needed to src/app/admin/leads/leads-client.tsx

### 1. Add imports at top (after line 10):
```typescript
import dynamic from 'next/dynamic';

// Dynamically import map to avoid SSR issues with Leaflet
const LeadsMap = dynamic(
  () => import('./components/LeadsMap'),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center">Loading map...</div> }
);
```

### 2. Add view mode state (after line 70):
```typescript
const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
const [geocodedProperties, setGeocodedProperties] = useState<any[]>([]);
const [isLoadingMap, setIsLoadingMap] = useState(false);
```

### 3. Add useEffect to fetch geocoded properties when switching to map view (after line 165):
```typescript
// Fetch geocoded properties for map view
useEffect(() => {
  if (viewMode === 'map' && geocodedProperties.length === 0) {
    const fetchGeocodedProperties = async () => {
      setIsLoadingMap(true);
      const supabase = createClient();
      
      const { data } = await supabase
        .from('properties')
        .select(`
          id,
          latitude,
          longitude,
          street_address,
          city,
          state,
          postal_code,
          lead_id,
          leads!inner(
            id,
            full_name,
            email,
            phone,
            status,
            priority_score
          )
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      
      setGeocodedProperties(data || []);
      setIsLoadingMap(false);
    };
    
    fetchGeocodedProperties();
  }
}, [viewMode, geocodedProperties.length]);
```

### 4. Add view toggle buttons (replace line 689-756 section with):
```typescript
return (
  <section className="space-y-4">
    {/* Mobile-first View Toggle */}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* View Mode Tabs - Mobile First */}
      <div className="inline-flex w-full sm:w-auto rounded-lg border border-black/10 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`flex-1 sm:flex-initial rounded-md px-4 py-2 text-sm font-semibold transition ${
            viewMode === 'list'
              ? 'bg-[var(--color-primary-gold)] text-[var(--color-navy)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-navy)]'
          }`}
        >
          📋 List
        </button>
        <button
          type="button"
          onClick={() => setViewMode('map')}
          className={`flex-1 sm:flex-initial rounded-md px-4 py-2 text-sm font-semibold transition ${
            viewMode === 'map'
              ? 'bg-[var(--color-primary-gold)] text-[var(--color-navy)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-navy)]'
          }`}
        >
          🗺️ Map
        </button>
      </div>

      {/* Action Buttons - Stack on mobile */}
      <div className="flex flex-wrap gap-2">
        {canBulkImport && (
          <button
            type="button"
            onClick={openBulkImportModal}
            className="flex-1 sm:flex-initial rounded-lg bg-[var(--color-navy)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
          >
            📊 Import
          </button>
        )}
        <button
          type="button"
          onClick={openCreateLeadModal}
          className="flex-1 sm:flex-initial rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
        >
          + Lead
        </button>
        <button
          type="button"
          onClick={signOut}
          disabled={isSigningOut}
          className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSigningOut ? "..." : "Sign out"}
        </button>
      </div>
    </div>
```

### 5. Wrap the existing filters and lead list in conditional rendering (around line 758):
```typescript
{viewMode === 'list' ? (
  <>
    {/* Existing filter section - line 758 onwards */}
    <div className="rounded-[1.4rem] border border-black/6 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      {/* All the existing filter HTML stays here */}
    </div>

    {/* Existing lead cards - line 910 onwards */}
    {!hasVisibleLeads ? (
      // ... existing empty state
    ) : (
      // ... existing lead cards
    )}

    {/* Existing pagination */}
  </>
) : (
  <>
    {/* Map View */}
    <div className="rounded-[1.4rem] border border-black/6 bg-white overflow-hidden shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <div className="h-[calc(100vh-280px)] min-h-[500px]">
        {isLoadingMap ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold text-gray-700">Loading map...</div>
              <div className="text-sm text-gray-500">Fetching geocoded properties</div>
            </div>
          </div>
        ) : (
          <LeadsMap
            properties={geocodedProperties.map(p => ({
              ...p,
              lead: p.leads
            }))}
            onPropertyClick={(propertyId, leadId) => {
              // Switch to list view and scroll to lead
              setViewMode('list');
              if (leadId) {
                // Could add scroll to lead functionality here
                console.log('Navigate to lead:', leadId);
              }
            }}
          />
        )}
      </div>

      {/* Map Stats */}
      <div className="border-t border-black/6 bg-[var(--color-surface-soft)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="font-semibold text-[var(--color-navy)]">{geocodedProperties.length}</span>
            <span className="ml-1 text-[var(--color-muted)]">geocoded properties</span>
          </div>
          <div>
            <span className="font-semibold text-[var(--color-navy)]">{leads.length}</span>
            <span className="ml-1 text-[var(--color-muted)]">total leads</span>
          </div>
          {geocodedProperties.length < leads.length && (
            <button
              type="button"
              onClick={async () => {
                // Trigger geocoding
                const response = await fetch('/api/admin/properties/geocode', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ limit: 50 }),
                });
                if (response.ok) {
                  window.location.reload();
                }
              }}
              className="ml-auto rounded-lg bg-[var(--color-primary-gold)] px-3 py-1.5 text-xs font-bold text-[var(--color-navy)] transition hover:brightness-95"
            >
              Geocode More Properties
            </button>
          )}
        </div>
      </div>
    </div>
  </>
)}
```

## Mobile-First Considerations:
- View toggle is full-width on mobile, auto-width on desktop
- Action buttons stack and stretch on mobile
- Map has min-height to be usable on all screens
- Shortened button text on mobile ("Import" vs "Bulk Import")
- Touch-friendly button sizes (min 44x44px)
