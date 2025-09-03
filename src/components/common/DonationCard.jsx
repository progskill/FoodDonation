import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'

const DonationCard = ({ donation }) => {
  const { currentUser, isGuest } = useAuth()
  const { showSuccess, showError } = useNotification()
  const [isRequesting, setIsRequesting] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

  const handleRequest = async () => {
    if (!currentUser && !isGuest) {
      showError('Please sign in or continue as guest to request donations')
      return
    }

    setIsRequesting(true)
    try {
      await updateDoc(doc(db, 'donations', donation.id), {
        status: 'claimed',
        claimedBy: currentUser?.uid || 'guest',
        claimedAt: serverTimestamp(),
        claimerName: currentUser?.email || 'Anonymous'
      })
      
      showSuccess('Donation requested! Contact the donor to arrange pickup.')
    } catch (error) {
      console.error('Error requesting donation:', error)
      showError('Failed to request donation. Please try again.')
    } finally {
      setIsRequesting(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-success-100 text-success-800'
      case 'claimed': return 'bg-orange-100 text-orange-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return '✅ Available'
      case 'claimed': return '🔄 Claimed'
      case 'completed': return '✅ Completed'
      default: return status
    }
  }

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            {donation.foodItem}
          </h3>
          <p className="text-sm text-gray-600">
            📍 {donation.location}
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
          {getStatusText(donation.status)}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <span className="w-4 h-4 mr-2">🥄</span>
          <span>Quantity: {donation.quantity}</span>
        </div>
        
        {donation.expirationDate && (
          <div className="flex items-center text-sm text-gray-600">
            <span className="w-4 h-4 mr-2">📅</span>
            <span>Expires: {formatDate(donation.expirationDate)}</span>
          </div>
        )}

        <div className="flex items-center text-sm text-gray-600">
          <span className="w-4 h-4 mr-2">👤</span>
          <span>By: {donation.donorName || 'Anonymous'}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <span className="w-4 h-4 mr-2">⏰</span>
          <span>Posted: {getTimeAgo(donation.createdAt)}</span>
        </div>
      </div>

      {/* Description */}
      {donation.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
            {donation.description}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        {donation.status === 'available' ? (
          <>
            <button
              onClick={handleRequest}
              disabled={isRequesting}
              className="btn-success flex-1 text-sm"
            >
              {isRequesting ? 'Requesting...' : '🤝 Request This Food'}
            </button>
            <button
              onClick={() => setShowDetails(true)}
              className="btn-secondary text-sm"
            >
              📞 Contact Info
            </button>
          </>
        ) : (
          <div className="text-center py-2">
            <span className="text-sm text-gray-600">
              {donation.status === 'claimed' 
                ? '⏳ This donation has been claimed'
                : '✅ This donation has been completed'
              }
            </span>
          </div>
        )}
      </div>

      {/* Contact Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <button 
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <strong className="text-gray-800">Food Item:</strong>
                <p>{donation.foodItem}</p>
              </div>
              <div>
                <strong className="text-gray-800">Pickup Location:</strong>
                <p>{donation.location}</p>
              </div>
              <div>
                <strong className="text-gray-800">Contact:</strong>
                <p>{donation.contactInfo}</p>
              </div>
              <div>
                <strong className="text-gray-800">Donor:</strong>
                <p>{donation.donorName || 'Anonymous Donor'}</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>📞 Next Steps:</strong><br />
                Contact the donor to arrange pickup time and get detailed directions.
              </p>
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="w-full mt-4 btn-primary"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DonationCard