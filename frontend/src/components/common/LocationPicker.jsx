import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Search, Navigation, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { searchGeocode, reverseGeocode } from '../../api/geocode.api';
import { useDebounce } from '../../hooks/useDebounce';
import '../../utils/leafletSetup';
import { OSM_ATTRIBUTION } from '../../utils/leafletSetup';

// Draggable Marker Hook Component
function DraggablePin({ position, onDragEnd }) {
  const markerRef = useRef(null);

  useMapEvents({
    click(e) {
      onDragEnd(e.latlng.lat, e.latlng.lng);
    },
  });

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onDragEnd(lat, lng);
      }
    },
  };

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
    />
  );
}

export default function LocationPicker({
  location, // { lat, lng }
  onLocationChange, // (location, addressParts) => void
  disabled = false,
  error = null,
}) {
  const defaultCenter = {
    lat: location?.lat || 19.076,
    lng: location?.lng || 72.8777,
  };

  const [position, setPosition] = useState(defaultCenter);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 400);
  const mapRef = useRef(null);

  // Sync internal position if external location changes
  useEffect(() => {
    if (location?.lat && location?.lng) {
      setPosition({ lat: location.lat, lng: location.lng });
      if (mapRef.current) {
        mapRef.current.flyTo([location.lat, location.lng], 15);
      }
    }
  }, [location?.lat, location?.lng]);

  // Geocode search with debounce
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    const fetchSuggestions = async () => {
      try {
        setSearching(true);
        const res = await searchGeocode(debouncedQuery);
        if (isMounted && res?.data) {
          setSuggestions(res.data);
        }
      } catch {
        // Silently catch throttle/network error
      } finally {
        if (isMounted) setSearching(false);
      }
    };

    fetchSuggestions();
    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  const handleSelectSuggestion = async (item) => {
    setSearchQuery('');
    setSuggestions([]);
    setPosition({ lat: item.lat, lng: item.lng });

    if (mapRef.current) {
      mapRef.current.flyTo([item.lat, item.lng], 16);
    }

    onLocationChange(
      { lat: item.lat, lng: item.lng },
      {
        city: item.city || '',
        state: item.state || '',
        pincode: item.pincode || '',
      }
    );
  };

  const handleMarkerDragEnd = async (lat, lng) => {
    setPosition({ lat, lng });

    try {
      const res = await reverseGeocode(lat, lng);
      const addr = res?.data || {};
      onLocationChange(
        { lat, lng },
        {
          city: addr.city || '',
          state: addr.state || '',
          pincode: addr.pincode || '',
          line1: addr.line1 || '',
        }
      );
    } catch {
      onLocationChange({ lat, lng }, null);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Verify India bounds
        if (lat < 6 || lat > 38 || lng < 68 || lng > 98) {
          toast.error('Detected location appears to be outside of India operations.');
          return;
        }

        setPosition({ lat, lng });
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 16);
        }

        handleMarkerDragEnd(lat, lng);
        toast.success('Location pinpointed successfully!');
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          toast.error('Location access was denied. Please drag the pin on the map.');
        } else {
          toast.error('Unable to retrieve current location.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-3">
      {/* Search & GPS Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search city, neighborhood, or landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-slate-200 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
          />
          {searching && (
            <Loader2
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-teal-600"
            />
          )}

          {/* Search Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-hover border border-teal-900/10 z-50 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full px-3 py-2 text-left hover:bg-teal-50/60 transition-colors flex items-start gap-2"
                >
                  <MapPin size={13} className="text-teal-700 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-text-heading line-clamp-1">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={disabled || locating}
          className="text-xs flex items-center justify-center gap-1.5 whitespace-nowrap bg-white"
        >
          {locating ? (
            <Loader2 size={13} className="animate-spin text-teal-700" />
          ) : (
            <Navigation size={13} className="text-teal-700" />
          )}
          <span>Use my location</span>
        </Button>
      </div>

      {/* Map Viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-64 sm:h-72">
        <MapContainer
          center={[defaultCenter.lat, defaultCenter.lng]}
          zoom={14}
          scrollWheelZoom={false}
          className="w-full h-full"
          ref={mapRef}
        >
          <TileLayer attribution={OSM_ATTRIBUTION} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <DraggablePin position={position} onDragEnd={handleMarkerDragEnd} />
        </MapContainer>

        <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] text-text-muted shadow-sm flex items-center gap-1.5">
          <MapPin size={11} className="text-teal-600" />
          <span>Click anywhere on the map or drag the pin to set pickup point</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

