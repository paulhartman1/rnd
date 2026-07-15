'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Status color mapping (same as LeadsMap for consistency)
const STATUS_COLORS: Record<string, string> = {
  'new': '#3b82f6',           // blue
  'contacted': '#eab308',     // yellow
  'offer-sent': '#f97316',    // orange
  'under-contract': '#8b5cf6', // purple
  'closed': '#22c55e',        // green
  'archived': '#6b7280',      // gray
};

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  deleted_at: string | null;
}

interface Property {
  id: string;
  latitude: number | null;
  longitude: number | null;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  lead_id: string;
  lead: Lead | null;
}

interface PropertiesMapProps {
  properties: Property[];
  onPropertyClick?: (propertyId: string) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

// Component to fit map bounds to markers
function FitBounds({ properties }: { properties: Property[] }) {
  const map = useMap();

  useEffect(() => {
    const validProps = properties.filter(p => p.latitude !== null && p.longitude !== null);
    if (validProps.length > 0) {
      const bounds = L.latLngBounds(
        validProps.map(p => [p.latitude!, p.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [properties, map]);

  return null;
}

// Create custom colored marker icon
function createColoredIcon(color: string) {
  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
      <circle cx="12.5" cy="12.5" r="6" fill="white"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker-icon',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
}

export default function PropertiesMap({ 
  properties, 
  onPropertyClick,
  center = [39.8283, -98.5795], // Geographic center of USA
  zoom = 4,
  height = '100%'
}: PropertiesMapProps) {

  if (properties.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <div className="mb-2 text-base sm:text-lg font-semibold text-gray-700">No Properties to Display</div>
          <div className="text-xs sm:text-sm text-gray-500">
            Properties need to be geocoded first. Import leads with addresses to see them on the map.
          </div>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <FitBounds properties={properties} />

      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={60}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
      >
        {properties.filter(p => p.latitude !== null && p.longitude !== null).map((property) => {
          const status = property.lead?.status || 'new';
          const color = STATUS_COLORS[status] || STATUS_COLORS['new'];
          const icon = createColoredIcon(color);

          return (
            <Marker
              key={property.id}
              position={[property.latitude!, property.longitude!]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onPropertyClick) {
                    onPropertyClick(property.id);
                  }
                },
              }}
            >
              <Popup>
                <div className="min-w-[200px] p-2">
                  <div className="mb-2 border-b pb-2">
                    <div className="font-bold text-[var(--color-navy)] text-sm sm:text-base">
                      {property.street_address}
                    </div>
                    <div className="text-xs sm:text-sm text-[var(--color-muted)]">
                      {property.city}, {property.state} {property.postal_code}
                    </div>
                  </div>

                  {property.lead ? (
                    <div className="space-y-1 text-xs sm:text-sm">
                      <div>
                        <span className="font-semibold">Owner:</span>{' '}
                        {property.lead.full_name}
                      </div>
                      {property.lead.phone && (
                        <div>
                          <span className="font-semibold">Phone:</span>{' '}
                          {property.lead.phone}
                        </div>
                      )}
                      {property.lead.email && (
                        <div className="break-all">
                          <span className="font-semibold">Email:</span>{' '}
                          {property.lead.email}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="inline-block rounded px-2 py-1 text-xs font-semibold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm text-gray-500">
                      No lead associated with this property
                    </div>
                  )}

                  {onPropertyClick && (
                    <button
                      onClick={() => onPropertyClick(property.id)}
                      className="mt-3 w-full rounded bg-[var(--color-primary-gold)] px-3 py-2 text-xs sm:text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 min-h-[44px]"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>

      {/* Map Legend - Responsive positioning */}
      <div className="leaflet-bottom leaflet-right">
        <div className="leaflet-control bg-white p-2 sm:p-3 shadow-md">
          <div className="mb-1 sm:mb-2 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-600">
            Lead Status
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                <div
                  className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize whitespace-nowrap">{status.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MapContainer>
  );
}
