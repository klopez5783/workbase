import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader, Navigation } from 'lucide-react';

/**
 * LocationPicker Component
 * Allows users to set location by:
 * 1. Using current GPS location
 * 2. Searching for an address
 * 3. Dragging a pin on the map
 */
export default function LocationPicker({ initialLocation, onLocationSet, address = '' }) {
  const [searchQuery, setSearchQuery] = useState(address);
  const [searching, setSearching] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [mapCenter, setMapCenter] = useState(
    initialLocation || { latitude: 39.9612, longitude: -82.9988 } // Columbus, OH default
  );
  const [error, setError] = useState('');
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize map on component mount
  useEffect(() => {
    // Load Leaflet CSS and JS
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
      initializeMap();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map when center changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([mapCenter.latitude, mapCenter.longitude], 15);
      updateMarker(mapCenter.latitude, mapCenter.longitude);
    }
  }, [mapCenter]);

  const initializeMap = () => {
    if (!window.L || mapRef.current) return;

    const map = window.L.map(mapContainerRef.current).setView(
      [mapCenter.latitude, mapCenter.longitude],
      15
    );

    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add draggable marker
    const customIcon = window.L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const marker = window.L.marker([mapCenter.latitude, mapCenter.longitude], {
      draggable: true,
      icon: customIcon
    }).addTo(map);

    // Update location when marker is dragged
    marker.on('dragend', function(e) {
      const position = e.target.getLatLng();
      const newLocation = {
        latitude: position.lat,
        longitude: position.lng,
        address: searchQuery || 'Selected Location'
      };
      setSelectedLocation(newLocation);
    });

    // Update location when map is clicked
    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      const newLocation = {
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
        address: searchQuery || 'Selected Location'
      };
      setSelectedLocation(newLocation);
    });

    mapRef.current = map;
    markerRef.current = marker;

    if (selectedLocation) {
      const location = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: selectedLocation.address || searchQuery
      };
      setSelectedLocation(location);
    }
  };

  const updateMarker = (lat, lng) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  // Clean address for geocoding by removing suite/apartment numbers
  const cleanAddressForSearch = (address) => {
    // Remove common suite/apartment patterns
    const patterns = [
      /\s*,?\s*(suite|ste|unit|apt|apartment|#)\s*\.?\s*[a-z0-9\-]+/gi,  // Suite 200, Apt 3B, #405
      /\s*,?\s*(building|bldg)\s*\.?\s*[a-z0-9\-]+/gi,                     // Building A
      /\s*,?\s*(floor|fl)\s*\.?\s*[0-9]+/gi,                               // Floor 3
      /\s*,?\s*(room|rm)\s*\.?\s*[0-9]+/gi,                                // Room 301
    ];
    
    let cleaned = address;
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Clean up extra spaces and commas
    cleaned = cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
    
    console.log('🧹 Original address:', address);
    console.log('🧹 Cleaned for search:', cleaned);
    
    return cleaned;
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
            address: searchQuery || 'Current Location'
          };
          setSelectedLocation(location);
          setMapCenter(location);
          setGettingLocation(false);
        },
        (err) => {
          setError('Failed to get location. Please enable location permissions.');
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
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
    // Clean the address (remove suite/apt numbers)
    const cleanedQuery = cleanAddressForSearch(searchQuery);
    const originalQuery = searchQuery;
    
    // Use improved API parameters
    const params = new URLSearchParams({
      format: 'json',
      q: cleanedQuery,
      limit: '5',
      addressdetails: '1',
      countrycodes: 'us',
      layer: 'address',  // ← NEW: Only search addresses
      email: 'workbase-app@example.com' // ← NEW: Required for usage policy
    });

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    
    console.log('🔍 Searching:', cleanedQuery);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WorkBase-App/1.0'
      }
    });
    
    const data = await response.json();
    
    console.log('📍 Results:', data.length);
    
    if (data.length > 0) {
      const result = data[0];
      const location = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        address: originalQuery // Keep suite info
      };
      
      setSelectedLocation(location);
      setMapCenter(location);
      setSearchQuery(originalQuery);
    } else {
      setError('Address not found. Try adjusting your address or use the map.');
    }
  } catch (err) {
    console.error('Error:', err);
    setError(`Error: ${err.message}`);
  } finally {
    setSearching(false);
  }
};

  const handleConfirm = () => {
    if (!selectedLocation) {
      setError('Please select a location on the map');
      return;
    }
    onLocationSet(selectedLocation);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Search Address
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchAddress()}
              placeholder="123 Main St, Columbus, OH"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={handleSearchAddress}
            disabled={searching}
            className="bg-blue-50 border-2 border-blue-200 text-blue-700 px-4 py-3 rounded-xl font-semibold hover:bg-blue-100 transition disabled:opacity-50"
          >
            {searching ? <Loader className="animate-spin" size={20} /> : 'Search'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Include suite/apt numbers - they'll be saved but won't affect the search
        </p>
      </div>

      {/* Current Location Button */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={gettingLocation}
        className="w-full bg-green-50 border-2 border-green-200 text-green-700 py-3 px-4 rounded-xl font-semibold hover:bg-green-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {gettingLocation ? (
          <>
            <Loader className="animate-spin" size={20} />
            Getting Location...
          </>
        ) : (
          <>
            <Navigation size={20} />
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


      {/* Map Container */}
      <div className="bg-white rounded-xl overflow-hidden border-2 border-gray-200">
        <div 
          ref={mapContainerRef} 
          style={{ height: '400px', width: '100%' }}
          className="relative"
        />
        
        {/* Map Instructions Overlay */}
        <div className="bg-gray-50 border-t border-gray-200 p-3">
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <MapPin size={16} className="flex-shrink-0 mt-0.5 text-blue-600" />
            <p>
              <strong>Drag the pin</strong> or <strong>click on the map</strong> to set the exact job site location. 
              You can also search for an address above.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
          <p className="text-blue-900 font-semibold text-sm mb-2">
            ✓ Location Selected
          </p>
          <p className="text-blue-700 text-xs mb-1">
            <strong>Coordinates:</strong> {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </p>
          {selectedLocation.address && (
            <p className="text-blue-700 text-xs">
              <strong>Address:</strong> {selectedLocation.address}
            </p>
          )}
        </div>
      )}

      {/* Confirm Button */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selectedLocation}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Confirm Location
      </button>
    </div>
  );
}