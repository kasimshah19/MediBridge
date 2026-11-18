import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../../utils/leafletSetup';
import { OSM_ATTRIBUTION } from '../../utils/leafletSetup';
import { MapPin, Building2, Pill } from 'lucide-react';
import Button from '../ui/Button';

// Custom Colored DivIcons for Origin vs Target Orgs vs Medicines
const createDivIcon = (colorClass, iconSvg) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div class="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md border-2 border-white ${colorClass}">${iconSvg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const originIcon = createDivIcon(
  'bg-teal-600',
  '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
);

const orgIcon = createDivIcon(
  'bg-blue-600',
  '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>'
);

const medIcon = createDivIcon(
  'bg-emerald-600',
  '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'
);

// Map Auto-Focuser component when center or radius changes
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], zoom || 12);
    }
  }, [center?.lat, center?.lng, zoom, map]);
  return null;
}

export default function NearbyMap({
  center, // { lat, lng }
  radiusKm = 10,
  markers = [], // [{ id, lat, lng, title, subtitle, distanceKm, type, actionLabel, onAction }]
  originLabel = 'Your Location',
  height = '400px',
  className = '',
}) {
  const mapRef = useRef(null);
  const defaultCoords = center?.lat && center?.lng ? center : { lat: 19.076, lng: 72.8777 };

  // Calculate zoom level based on radius
  const zoomLevel = radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : 11;

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-200 shadow-sm ${className}`} style={{ height }}>
      <MapContainer
        center={[defaultCoords.lat, defaultCoords.lng]}
        zoom={zoomLevel}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
        ref={mapRef}
      >
        <TileLayer attribution={OSM_ATTRIBUTION} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapRecenter center={defaultCoords} zoom={zoomLevel} />

        {/* Radius Circle Overlay */}
        {radiusKm && (
          <Circle
            center={[defaultCoords.lat, defaultCoords.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#0d9488',
              fillColor: '#0d9488',
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '5, 8',
            }}
          />
        )}

        {/* Origin Marker */}
        <Marker position={[defaultCoords.lat, defaultCoords.lng]} icon={originIcon}>
          <Popup>
            <div className="p-1">
              <span className="font-semibold text-slate-900 block text-sm">{originLabel}</span>
              <span className="text-xs text-slate-500">Center of search radius ({radiusKm} km)</span>
            </div>
          </Popup>
        </Marker>

        {/* Surrounding Target Markers */}
        {markers.map((m) => {
          if (!m.lat || !m.lng) return null;
          const icon = m.type === 'medicine' ? medIcon : orgIcon;

          return (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={icon}>
              <Popup>
                <div className="p-1 max-w-[220px]">
                  <h4 className="font-semibold text-slate-900 text-sm">{m.title}</h4>
                  {m.subtitle && <p className="text-xs text-slate-600 mt-0.5">{m.subtitle}</p>}
                  {m.distanceKm !== undefined && (
                    <p className="text-[11px] font-medium text-emerald-700 mt-1">
                      Distance: ~{typeof m.distanceKm === 'number' ? m.distanceKm.toFixed(1) : m.distanceKm} km
                    </p>
                  )}
                  {m.actionLabel && m.onAction && (
                    <div className="mt-2.5">
                      <Button size="xs" variant="primary" className="w-full text-xs" onClick={() => m.onAction(m)}>
                        {m.actionLabel}
                      </Button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
