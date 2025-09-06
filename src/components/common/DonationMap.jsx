import React from "react";
import { useState, useEffect, useRef } from "react";

const DonationMap = ({ donations }) => {
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-success-500";
      case "claimed":
        return "bg-orange-500";
      case "completed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const donationsWithCoordinates = donations.filter((d) => d.coordinates && d.coordinates.lat && d.coordinates.lng);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === "your-google-maps-api-key") {
      setMapError("Google Maps API key not configured");
      return;
    }

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

  // Initialize map and markers
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstanceRef.current) {
      try {
        // Create map
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.7749, lng: -122.4194 }, // San Francisco default
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });
        
        mapInstanceRef.current = map;
        
        // Try to get user's location to center map
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              map.setCenter(userLocation);
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
  }, [mapLoaded]);

  // Update markers when donations change
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Create markers for donations with coordinates
      const bounds = new window.google.maps.LatLngBounds();
      
      donationsWithCoordinates.forEach((donation) => {
        const position = {
          lat: parseFloat(donation.coordinates.lat),
          lng: parseFloat(donation.coordinates.lng),
        };
        
        // Create marker
        const marker = new window.google.maps.Marker({
          position,
          map: mapInstanceRef.current,
          title: donation.foodItem,
          icon: {
            url: getMarkerIcon(donation.status),
            scaledSize: new window.google.maps.Size(40, 40),
          },
        });
        
        // Add click listener to marker
        marker.addListener('click', () => {
          setSelectedDonation(donation);
        });
        
        markersRef.current.push(marker);
        bounds.extend(position);
      });
      
      // Fit map to show all markers
      if (donationsWithCoordinates.length > 0) {
        if (donationsWithCoordinates.length === 1) {
          mapInstanceRef.current.setCenter({
            lat: parseFloat(donationsWithCoordinates[0].coordinates.lat),
            lng: parseFloat(donationsWithCoordinates[0].coordinates.lng),
          });
          mapInstanceRef.current.setZoom(15);
        } else {
          mapInstanceRef.current.fitBounds(bounds);
        }
      }
    }
  }, [donationsWithCoordinates, mapLoaded]);

  const getMarkerIcon = (status) => {
    const color = status === 'available' ? 'green' : 
                  status === 'partially_claimed' ? 'orange' :
                  status === 'fully_booked' ? 'red' : 'gray';
    
    return `data:image/svg+xml;charset=UTF-8,%3csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='20' cy='20' r='15' fill='${color}' stroke='white' stroke-width='3'/%3e%3ctext x='20' y='25' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3e🍽️%3c/text%3e%3c/svg%3e`;
  };

  return (
    <div className="relative">
      {/* Map Legend */}
      <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg z-10">
        <h4 className="font-medium text-gray-800 mb-2">Legend</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            <span>
              Available (
              {donations.filter((d) => d.status === "available").length})
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
            <span>
              Partial ({donations.filter((d) => d.status === "partially_claimed").length})
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
            <span>
              Fully Booked (
              {donations.filter((d) => d.status === "fully_booked").length})
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-500 rounded-full mr-2"></div>
            <span>
              Completed (
              {donations.filter((d) => d.status === "completed").length})
            </span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden relative">
        {mapError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-lg font-medium">{mapError}</p>
              <p className="text-sm mt-2">
                Add VITE_GOOGLE_MAPS_API_KEY to your .env file
              </p>
            </div>
          </div>
        ) : !mapLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="animate-spin text-6xl mb-4">🗺️</div>
              <p className="text-lg font-medium">Loading Interactive Map...</p>
              <p className="text-sm">Please wait while we load the map</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}
      </div>

      {/* Selected Donation Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedDonation.foodItem}
              </h3>
              <button
                onClick={() => setSelectedDonation(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p>
                <strong>Quantity:</strong> {selectedDonation.remainingQuantity || selectedDonation.quantity} 
                {selectedDonation.remainingQuantity && selectedDonation.originalQuantity && 
                  ` of ${selectedDonation.originalQuantity}`} servings
              </p>
              <p>
                <strong>Location:</strong> {selectedDonation.location}
              </p>
              <p>
                <strong>Donor:</strong>{" "}
                {selectedDonation.donorName || "Anonymous"}
              </p>
              <p>
                <strong>Posted:</strong>{" "}
                {getTimeAgo(selectedDonation.createdAt)}
              </p>
              {selectedDonation.expirationDate && (
                <p>
                  <strong>Expires:</strong>{" "}
                  {formatDate(selectedDonation.expirationDate)}
                </p>
              )}
              <div className="flex items-center">
                <strong>Status:</strong>
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    selectedDonation.status === "available"
                      ? "bg-green-100 text-green-800"
                      : selectedDonation.status === "partially_claimed"
                      ? "bg-orange-100 text-orange-800"
                      : selectedDonation.status === "fully_booked"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {selectedDonation.status === "available"
                    ? "✅ Available"
                    : selectedDonation.status === "partially_claimed"
                    ? "⚡ Limited Stock"
                    : selectedDonation.status === "fully_booked"
                    ? "🔴 Fully Booked"
                    : "✅ Completed"}
                </span>
              </div>
            </div>

            {selectedDonation.description && (
              <div className="mb-4">
                <strong className="text-sm text-gray-700">Description:</strong>
                <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                  {selectedDonation.description}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const query = encodeURIComponent(selectedDonation.location);
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${query}`,
                    "_blank"
                  );
                }}
                className="btn-primary flex-1"
              >
                🗺️ Get Directions
              </button>
              <button
                onClick={() => setSelectedDonation(null)}
                className="btn-secondary px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Coordinates Warning */}
      {donations.length > donationsWithCoordinates.length && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ {donations.length - donationsWithCoordinates.length} donation(s)
            don't have location coordinates and aren't shown above.
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          💡 To enable full interactive map functionality:
        </p>
        <ol className="text-sm text-blue-700 mt-2 space-y-1">
          <li>1. Get a Google Maps API key from Google Cloud Console</li>
          <li>2. Add it to your .env file as VITE_GOOGLE_MAPS_API_KEY</li>
          <li>3. Enable Maps JavaScript API and Places API</li>
        </ol>
      </div>
    </div>
  );
};

export default DonationMap;
