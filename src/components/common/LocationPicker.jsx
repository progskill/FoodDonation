import React from "react";
import { useState, useEffect, useRef } from "react";

const LocationPicker = ({ onLocationSelect, initialLocation }) => {
  const [address, setAddress] = useState(initialLocation || "");
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  useEffect(() => {
    // Check if API key exists
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === "your-google-maps-api-key") {
      setMapError("Google Maps API key not configured");
      return;
    }

    // Load Google Maps script
    if (!window.google && !document.getElementById("google-maps-script")) {
      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapLoaded(true);
        setMapError(null);
      };
      script.onerror = () => {
        setMapError("Failed to load Google Maps");
      };
      document.head.appendChild(script);
    } else if (window.google) {
      setMapLoaded(true);
      setMapError(null);
    }
  }, []);

  // Initialize map when loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstanceRef.current) {
      try {
        // Create map
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.7749, lng: -122.4194 }, // San Francisco default
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        
        mapInstanceRef.current = map;
        geocoderRef.current = new window.google.maps.Geocoder();
        
        // Add click listener to map
        map.addListener('click', (event) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          const position = { lat, lng };
          
          setSelectedPosition(position);
          updateMarker(position);
          
          // Reverse geocode to get address
          if (geocoderRef.current) {
            geocoderRef.current.geocode({ location: position }, (results, status) => {
              if (status === 'OK' && results[0]) {
                const addr = results[0].formatted_address;
                setAddress(addr);
                onLocationSelect(addr, position);
              } else {
                onLocationSelect('Selected Location', position);
              }
            });
          }
        });
        
        // Try to get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              map.setCenter(userLocation);
              map.setZoom(14);
            },
            (error) => {
              console.log('Geolocation error:', error);
            }
          );
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('Error initializing map');
      }
    }
  }, [mapLoaded, onLocationSelect]);
  
  const updateMarker = (position) => {
    if (!mapInstanceRef.current) return;
    
    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    
    // Create new marker
    markerRef.current = new window.google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      title: 'Selected Location',
      animation: window.google.maps.Animation.DROP,
    });
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    if (!address.trim()) return;

    if (geocoderRef.current) {
      // Use real Google Geocoding API
      geocoderRef.current.geocode({ address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const position = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          
          setSelectedPosition(position);
          updateMarker(position);
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(position);
            mapInstanceRef.current.setZoom(15);
          }
          
          onLocationSelect(address, position);
        } else {
          alert('Address not found. Please try a different address.');
        }
      });
    } else {
      // Fallback for when Maps isn't loaded
      alert('Maps is not loaded yet. Please try again in a moment.');
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          setSelectedPosition(userLocation);
          updateMarker(userLocation);
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(userLocation);
            mapInstanceRef.current.setZoom(15);
          }
          
          // Reverse geocode to get readable address
          if (geocoderRef.current) {
            geocoderRef.current.geocode({ location: userLocation }, (results, status) => {
              if (status === 'OK' && results[0]) {
                const addr = results[0].formatted_address;
                setAddress(addr);
                onLocationSelect(addr, userLocation);
              } else {
                setAddress("Current Location");
                onLocationSelect("Current Location", userLocation);
              }
            });
          } else {
            setAddress("Current Location");
            onLocationSelect("Current Location", userLocation);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert(
            "Unable to get your location. Please enter an address manually."
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Address Search */}
      <form onSubmit={handleAddressSubmit} className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter pickup address..."
          className="input flex-1"
          required
        />
        <button
          type="submit"
          className="btn-secondary px-4 py-2 whitespace-nowrap"
        >
          📍 Set Location
        </button>
      </form>

      {/* Get Current Location Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={getCurrentLocation}
          className="btn-primary px-4 py-2 text-sm"
        >
          📱 Use Current Location
        </button>
      </div>

      {/* Map Container */}
      <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden relative border-2">
        {mapError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-sm font-medium">{mapError}</p>
              <p className="text-xs mt-2">
                Add VITE_GOOGLE_MAPS_API_KEY to your .env file
              </p>
            </div>
          </div>
        ) : !mapLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="animate-spin text-4xl mb-2">🗺️</div>
              <p className="text-sm">Loading Map...</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}
      </div>

      {/* Selected Location Display */}
      {selectedPosition && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ <strong>Location Selected:</strong> {address}
          </p>
          <p className="text-xs text-green-600">
            Coordinates: {selectedPosition.lat.toFixed(4)},{" "}
            {selectedPosition.lng.toFixed(4)}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tips:</strong>
        </p>
        <ul className="text-xs text-blue-700 mt-1 space-y-1">
          <li>• Use "Current Location" for your exact position</li>
          <li>• Or enter a specific address for pickup</li>
          <li>• Be as specific as possible for easy pickup</li>
        </ul>
      </div>
    </div>
  );
};

export default LocationPicker;
