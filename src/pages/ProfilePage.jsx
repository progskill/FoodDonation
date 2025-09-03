import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'

const ProfilePage = () => {
  const { currentUser, logout } = useAuth()
  const { showSuccess, showError } = useNotification()
  const [activeTab, setActiveTab] = useState('donations')
  const [userDonations, setUserDonations] = useState([])
  const [userRequests, setUserRequests] = useState([])
  const [claimedDonations, setClaimedDonations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return

    // Get user's donations
    const donationsQuery = query(
      collection(db, 'donations'),
      where('donorId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )

    // Get user's requests
    const requestsQuery = query(
      collection(db, 'requests'),
      where('requesterId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )

    // Get claimed donations
    const claimedQuery = query(
      collection(db, 'donations'),
      where('claimedBy', '==', currentUser.uid),
      orderBy('claimedAt', 'desc')
    )

    const unsubscribeDonations = onSnapshot(donationsQuery, (snapshot) => {
      const donations = []
      snapshot.forEach((doc) => {
        donations.push({ id: doc.id, ...doc.data() })
      })
      setUserDonations(donations)
    })

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requests = []
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() })
      })
      setUserRequests(requests)
    })

    const unsubscribeClaimed = onSnapshot(claimedQuery, (snapshot) => {
      const claimed = []
      snapshot.forEach((doc) => {
        claimed.push({ id: doc.id, ...doc.data() })
      })
      setClaimedDonations(claimed)
      setLoading(false)
    })

    return () => {
      unsubscribeDonations()
      unsubscribeRequests()
      unsubscribeClaimed()
    }
  }, [currentUser])

  const handleStatusUpdate = async (itemId, collection_name, newStatus) => {
    try {
      await updateDoc(doc(db, collection_name, itemId), {
        status: newStatus,
        updatedAt: new Date()
      })
      showSuccess(`Status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      showError('Failed to update status')
    }
  }

  const handleDelete = async (itemId, collection_name) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await deleteDoc(doc(db, collection_name, itemId))
      showSuccess('Item deleted successfully')
    } catch (error) {
      console.error('Error deleting item:', error)
      showError('Failed to delete item')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
      case 'open':
        return 'bg-success-100 text-success-800'
      case 'claimed':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
      case 'fulfilled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your profile</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            👤 My Profile
          </h1>
          <p className="text-gray-600">
            Manage your donations, requests, and account settings
          </p>
        </div>

        {/* Profile Info */}
        <div className="card mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {currentUser.email}
              </h3>
              <p className="text-gray-600">
                Member since {formatDate(currentUser.metadata?.creationTime)}
              </p>
            </div>
            <button
              onClick={logout}
              className="btn-secondary mt-4 sm:mt-0"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600">
              {userDonations.length}
            </div>
            <div className="text-sm text-gray-600">Donations Made</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-success-600">
              {claimedDonations.length}
            </div>
            <div className="text-sm text-gray-600">Food Received</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-600">
              {userRequests.length}
            </div>
            <div className="text-sm text-gray-600">Requests Made</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-600">
              {userDonations.filter(d => d.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('donations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'donations'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Donations ({userDonations.length})
              </button>
              <button
                onClick={() => setActiveTab('claimed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'claimed'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Claimed Food ({claimedDonations.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Requests ({userRequests.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'donations' && (
            <div>
              {userDonations.length > 0 ? (
                <div className="space-y-4">
                  {userDonations.map((donation) => (
                    <div key={donation.id} className="card">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {donation.foodItem}
                          </h3>
                          <p className="text-sm text-gray-600">
                            📍 {donation.location}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                          {donation.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
                        <div>Quantity: {donation.quantity}</div>
                        <div>Posted: {formatDate(donation.createdAt)}</div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {donation.status === 'available' && (
                          <button
                            onClick={() => handleStatusUpdate(donation.id, 'donations', 'completed')}
                            className="btn-success text-sm"
                          >
                            Mark Complete
                          </button>
                        )}
                        {donation.status === 'claimed' && (
                          <button
                            onClick={() => handleStatusUpdate(donation.id, 'donations', 'completed')}
                            className="btn-success text-sm"
                          >
                            Mark Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(donation.id, 'donations')}
                          className="btn-secondary text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">You haven't made any donations yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'claimed' && (
            <div>
              {claimedDonations.length > 0 ? (
                <div className="space-y-4">
                  {claimedDonations.map((donation) => (
                    <div key={donation.id} className="card">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {donation.foodItem}
                          </h3>
                          <p className="text-sm text-gray-600">
                            📍 {donation.location}
                          </p>
                          <p className="text-sm text-gray-600">
                            By: {donation.donorName}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                          {donation.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
                        <div>Quantity: {donation.quantity}</div>
                        <div>Claimed: {formatDate(donation.claimedAt)}</div>
                      </div>

                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        <strong>Contact:</strong> {donation.contactInfo}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">You haven't claimed any donations yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              {userRequests.length > 0 ? (
                <div className="space-y-4">
                  {userRequests.map((request) => (
                    <div key={request.id} className="card">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {request.foodType.replace('-', ' ')} - {request.quantity}
                          </h3>
                          <p className="text-sm text-gray-600">
                            📍 {request.location}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
                        <div>Urgency: {request.urgency}</div>
                        <div>Posted: {formatDate(request.createdAt)}</div>
                      </div>

                      {request.description && (
                        <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded">
                          {request.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {request.status === 'open' && (
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'requests', 'fulfilled')}
                            className="btn-success text-sm"
                          >
                            Mark Fulfilled
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(request.id, 'requests')}
                          className="btn-secondary text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">You haven't made any requests yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage