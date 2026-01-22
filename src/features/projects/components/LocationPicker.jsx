import { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Loader, Navigation, X, Check } from 'lucide-react';

/**
 * LocationPicker Component - DoorDash Style
 * 1. Search/enter address or use GPS
 * 2. Click to open full-screen map for precise pin placement
 * 3. Confirm location
 */
export default function LocationPicker({ initialLocation, onLocationSet, address = '' }) {
  const [searchQuery, setSearchQuery] = useState(address);
  const [searching, setSearching] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [showFullScreenMap, setShowFullScreenMap] = useState(false);
  const [error, setError] = useState('');

  const cleanAddressForSearch = (address) => {
    const patterns = [
      /\s*,?\s*(suite|ste|unit|apt|apartment|#)\s*\.?\s*[a-z0-9\-]+/gi,
      /\s*,?\s*(building|bldg)\s*\.?\s*[a-z0-9\-]+/gi,
      /\s*,?\s*(floor|fl)\s*\.?\s*[0-9]+/gi,
      /\s*,?\s*(room|rm)\s*\.?\s*[0-9]+/gi,
    ];
    
    let cleaned = address;
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    return cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
  };

  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    setError('');

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: 'Current Location'
          };
          setSelectedLocation(location);
          setGettingLocation(false);
        },
        (err) => {
          setError('Failed to get location. Please enable location permissions.');
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (err) {
      setError(err.message);
      setGettingLocation(false);
    }
  };

  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter an address to search');
      return;
    }

    setSearching(true);
    setError('');

    try {
      const cleanedQuery = cleanAddressForSearch(searchQuery);
      const originalQuery = searchQuery;
      
      const params = new URLSearchParams({
        format: 'json',
        q: cleanedQuery,
        limit: '5',
        addressdetails: '1',
        countrycodes: 'us',
        layer: 'address',
        email: 'workbase-app@example.com'
      });

      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'WorkBase-App/1.0' }
      });
      
      const data = await response.json();
      
      if (data.length > 0) {
        const result = data[0];
        const location = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          address: originalQuery
        };
        
        setSelectedLocation(location);
        setSearchQuery(originalQuery);
      } else {
        setError('Address not found. Try adjusting your address.');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      setError('Please select a location');
      return;
    }
    onLocationSet(selectedLocation);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Search Bar */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Search Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchAddress()}
              placeholder="123 Main St, Columbus, OH"
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleSearchAddress}
              disabled={searching}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {searching ? <Loader className="animate-spin" size={18} /> : <Search size={18} />}
            </button>
          </div>
        </div>

        {/* Current Location Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={gettingLocation}
          className="w-full bg-green-50 border-2 border-green-200 text-green-700 py-2.5 px-4 rounded-xl font-semibold hover:bg-green-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {gettingLocation ? (
            <>
              <Loader className="animate-spin" size={18} />
              Getting Location...
            </>
          ) : (
            <>
              <Navigation size={18} />
              Use My Current Location
            </>
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Selected Location Preview - Mini Map */}
        {selectedLocation && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl overflow-hidden">
            <MiniMapPreview 
              location={selectedLocation}
              onAdjustClick={() => setShowFullScreenMap(true)}
            />
          </div>
        )}

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedLocation}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Check size={20} />
          Confirm Location
        </button>
      </div>

      {/* Full-Screen Map Modal */}
      {showFullScreenMap && (
        <FullScreenMapPicker
          initialLocation={selectedLocation}
          onConfirm={(location) => {
            setSelectedLocation(location);
            setShowFullScreenMap(false);
          }}
          onClose={() => setShowFullScreenMap(false)}
        />
      )}
    </>
  );
}

/**
 * Mini Map Preview Component
 */
function MiniMapPreview({ location, onAdjustClick }) {
  const miniMapRef = useRef(null);
  const miniMapInstanceRef = useRef(null);

  useEffect(() => {
    const initializeMiniMap = () => {
      if (!window.L || miniMapInstanceRef.current || !miniMapRef.current) return;

      // Create map
      const map = window.L.map(miniMapRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        attributionControl: false
      }).setView([location.latitude, location.longitude], 15);

      // Add tile layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Add marker
      const customIcon = window.L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        shadowSize: [41, 41]
      });

      window.L.marker([location.latitude, location.longitude], {
        icon: customIcon
      }).addTo(map);

      miniMapInstanceRef.current = map;

      // Force map to update size
      setTimeout(() => {
        if (miniMapInstanceRef.current) {
          miniMapInstanceRef.current.invalidateSize();
        }
      }, 100);
    };

    // Load Leaflet if not already loaded
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initializeMiniMap();
      document.head.appendChild(script);
    } else {
      setTimeout(initializeMiniMap, 100);
    }

    return () => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
    };
  }, [location]);

  return (
    <div className="relative">
      {/* Mini Map */}
      <div 
        ref={miniMapRef}
        className="w-full h-48 bg-gray-100"
        style={{ position: 'relative', zIndex: 1 }}
      />

      {/* Coordinates Badge - Top Left */}
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md" style={{ zIndex: 10 }}>
        <p className="text-gray-700 text-xs font-mono">
          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </p>
      </div>

      {/* Adjust Pin Button - Bottom Right */}
      <button
        type="button"
        onClick={onAdjustClick}
        className="absolute bottom-3 right-3 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 hover:shadow-xl"
        style={{ zIndex: 10 }}
      >
        <MapPin size={16} />
        Adjust Pin
      </button>

    </div>
  );
}

/**
 * Full-Screen Map for Precise Pin Placement
 */
function FullScreenMapPicker({ initialLocation, onConfirm, onClose }) {
  const [tempLocation, setTempLocation] = useState(initialLocation);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    const initializeMap = () => {
      if (!window.L || mapRef.current || !mapContainerRef.current) return;

      const map = window.L.map(mapContainerRef.current).setView(
        [initialLocation.latitude, initialLocation.longitude],
        17
      );

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const customIcon = window.L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        shadowSize: [41, 41]
      });

      const marker = window.L.marker([initialLocation.latitude, initialLocation.longitude], {
        draggable: true,
        icon: customIcon
      }).addTo(map);

      marker.on('dragend', (e) => {
        const position = e.target.getLatLng();
        setTempLocation({
          latitude: position.lat,
          longitude: position.lng,
          address: initialLocation.address
        });
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setTempLocation({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
          address: initialLocation.address
        });
      });

      mapRef.current = map;
      markerRef.current = marker;
    };

    // Load Leaflet
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initializeMap();
      document.head.appendChild(script);
    } else {
      setTimeout(initializeMap, 100);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialLocation]);

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md z-20 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Adjust Pin Location</h3>
            <p className="text-sm text-gray-600">Drag the pin to the exact spot</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div 
        ref={mapContainerRef}
        className="flex-1 w-full"
      />

      {/* Footer with Confirm Button */}
      <div className="bg-white shadow-lg p-4 z-20 flex-shrink-0">
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mb-3">
          <p className="text-blue-700 text-xs font-mono">
            {tempLocation.latitude.toFixed(6)}, {tempLocation.longitude.toFixed(6)}
          </p>
        </div>
        <button
          onClick={() => onConfirm(tempLocation)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
        >
          <Check size={20} />
          Confirm Pin Location
        </button>
      </div>
    </div>
  );
}