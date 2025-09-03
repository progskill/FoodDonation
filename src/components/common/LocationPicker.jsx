import { useState, useEffect } from 'react'

const LocationPicker = ({ onLocationSelect, initialLocation }) => {
  const [address, setAddress] = useState(initialLocation || '')
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    // Load Google Maps script
    if (!window.google && !document.getElementById('google-maps-script')) {
      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'your-google-maps-api-key'}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => setMapLoaded(true)
      document.head.appendChild(script)
    } else if (window.google) {
      setMapLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (mapLoaded && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setSelectedPosition(userLocation)
        },
        (error) => {
          console.log('Geolocation error:', error)
        }
      )
    }
  }, [mapLoaded])

  const handleAddressSubmit = (e) => {
    e.preventDefault()
    if (!address.trim()) return

    // Simple geocoding simulation - in production, use Google Geocoding API
    const mockCoordinates = {
      lat: 37.7749 + (Math.random() - 0.5) * 0.1,
      lng: -122.4194 + (Math.random() - 0.5) * 0.1
    }
    
    setSelectedPosition(mockCoordinates)
    onLocationSelect(address, mockCoordinates)
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setSelectedPosition(userLocation)
          setAddress('Current Location')
          onLocationSelect('Current Location', userLocation)
        },
        (error) => {
          alert('Unable to get your location. Please enter an address manually.')
        }
      )
    } else {
      alert('Geolocation is not supported by this browser.')
    }
  }

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

      {/* Map Placeholder */}
      <div className="w-full h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-sm">Interactive Map</p>
          <p className="text-xs">Google Maps will load here with API key</p>
        </div>
      </div>

      {/* Selected Location Display */}
      {selectedPosition && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ <strong>Location Selected:</strong> {address}
          </p>
          <p className="text-xs text-green-600">
            Coordinates: {selectedPosition.lat.toFixed(4)}, {selectedPosition.lng.toFixed(4)}
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
  )
}

export default LocationPicker