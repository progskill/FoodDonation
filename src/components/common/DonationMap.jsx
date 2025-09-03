import { useState } from 'react'

const DonationMap = ({ donations }) => {
  const [selectedDonation, setSelectedDonation] = useState(null)

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
  }

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-success-500'
      case 'claimed': return 'bg-orange-500'
      case 'completed': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const donationsWithCoordinates = donations.filter(d => d.coordinates)

  return (
    <div className="relative">
      {/* Map Legend */}
      <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg z-10">
        <h4 className="font-medium text-gray-800 mb-2">Legend</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-success-500 rounded-full mr-2"></div>
            <span>Available ({donations.filter(d => d.status === 'available').length})</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
            <span>Claimed ({donations.filter(d => d.status === 'claimed').length})</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-500 rounded-full mr-2"></div>
            <span>Completed ({donations.filter(d => d.status === 'completed').length})</span>
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="w-full h-96 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-lg font-medium">Interactive Map View</p>
          <p className="text-sm">Google Maps will display here with your API key</p>
          <p className="text-xs mt-2">Add VITE_GOOGLE_MAPS_API_KEY to your .env file</p>
        </div>

        {/* Simulated Markers */}
        {donationsWithCoordinates.length > 0 && (
          <div className="absolute inset-4 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 h-full">
              {donationsWithCoordinates.slice(0, 8).map((donation, index) => (
                <div
                  key={donation.id}
                  className="bg-white rounded-lg p-2 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedDonation(donation)}
                >
                  <div className="flex items-center mb-1">
                    <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(donation.status)}`}></div>
                    <span className="text-xs font-medium truncate">{donation.foodItem}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{donation.location}</p>
                  <p className="text-xs text-gray-500">{getTimeAgo(donation.createdAt)}</p>
                </div>
              ))}
              {donationsWithCoordinates.length > 8 && (
                <div className="bg-gray-200 rounded-lg p-2 flex items-center justify-center">
                  <span className="text-xs text-gray-600">
                    +{donationsWithCoordinates.length - 8} more
                  </span>
                </div>
              )}
            </div>
          </div>
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
              <p><strong>Quantity:</strong> {selectedDonation.quantity}</p>
              <p><strong>Location:</strong> {selectedDonation.location}</p>
              <p><strong>Donor:</strong> {selectedDonation.donorName || 'Anonymous'}</p>
              <p><strong>Posted:</strong> {getTimeAgo(selectedDonation.createdAt)}</p>
              {selectedDonation.expirationDate && (
                <p><strong>Expires:</strong> {formatDate(selectedDonation.expirationDate)}</p>
              )}
              <div className="flex items-center">
                <strong>Status:</strong>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  selectedDonation.status === 'available' 
                    ? 'bg-success-100 text-success-800'
                    : selectedDonation.status === 'claimed'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedDonation.status === 'available' ? '✅ Available' :
                   selectedDonation.status === 'claimed' ? '🔄 Claimed' : '✅ Completed'}
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
                  const query = encodeURIComponent(selectedDonation.location)
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
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
            ⚠️ {donations.length - donationsWithCoordinates.length} donation(s) don't have location coordinates and aren't shown above.
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
  )
}

export default DonationMap