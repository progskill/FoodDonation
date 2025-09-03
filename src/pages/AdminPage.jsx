import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc, where, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'

const AdminPage = () => {
  const { currentUser } = useAuth()
  const { showSuccess, showError } = useNotification()
  const [activeTab, setActiveTab] = useState('donations')
  const [donations, setDonations] = useState([])
  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  // Simple admin check (in production, use proper role-based authentication)
  const isAdmin = currentUser?.email === 'admin@foodbank.com' || 
                  currentUser?.email?.includes('admin') || 
                  currentUser?.uid === 'admin-uid'

  useEffect(() => {
    if (!isAdmin) return

    // Get all donations
    const donationsQuery = query(
      collection(db, 'donations'),
      orderBy('createdAt', 'desc')
    )

    // Get all requests
    const requestsQuery = query(
      collection(db, 'requests'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribeDonations = onSnapshot(donationsQuery, (snapshot) => {
      const donationsData = []
      snapshot.forEach((doc) => {
        donationsData.push({ id: doc.id, ...doc.data() })
      })
      setDonations(donationsData)
      calculateStats(donationsData, requests)
    })

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = []
      snapshot.forEach((doc) => {
        requestsData.push({ id: doc.id, ...doc.data() })
      })
      setRequests(requestsData)
      calculateStats(donations, requestsData)
      setLoading(false)
    })

    return () => {
      unsubscribeDonations()
      unsubscribeRequests()
    }
  }, [isAdmin])

  const calculateStats = (donationsData, requestsData) => {
    const stats = {
      totalDonations: donationsData.length,
      availableDonations: donationsData.filter(d => d.status === 'available').length,
      claimedDonations: donationsData.filter(d => d.status === 'claimed').length,
      completedDonations: donationsData.filter(d => d.status === 'completed').length,
      totalRequests: requestsData.length,
      openRequests: requestsData.filter(r => r.status === 'open').length,
      fulfilledRequests: requestsData.filter(r => r.status === 'fulfilled').length,
      uniqueDonors: new Set(donationsData.map(d => d.donorId)).size,
      uniqueRequesters: new Set(requestsData.map(r => r.requesterId)).size
    }
    setStats(stats)
  }

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
    return date.toLocaleString()
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🛠️ Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage donations, requests, and monitor platform activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600">
              {stats.totalDonations}
            </div>
            <div className="text-sm text-gray-600">Total Donations</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-success-600">
              {stats.availableDonations}
            </div>
            <div className="text-sm text-gray-600">Available Now</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stats.totalRequests}
            </div>
            <div className="text-sm text-gray-600">Total Requests</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-600">
              {stats.uniqueDonors}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📊 Donation Statistics
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Available:</span>
                <span className="font-medium">{stats.availableDonations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Claimed:</span>
                <span className="font-medium">{stats.claimedDonations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium">{stats.completedDonations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unique Donors:</span>
                <span className="font-medium">{stats.uniqueDonors}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📋 Request Statistics
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Open Requests:</span>
                <span className="font-medium">{stats.openRequests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fulfilled:</span>
                <span className="font-medium">{stats.fulfilledRequests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unique Requesters:</span>
                <span className="font-medium">{stats.uniqueRequesters}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-medium">
                  {stats.totalRequests > 0 
                    ? Math.round((stats.fulfilledRequests / stats.totalRequests) * 100)
                    : 0}%
                </span>
              </div>
            </div>
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
                All Donations ({donations.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Requests ({requests.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'donations' && (
            <div>
              {donations.length > 0 ? (
                <div className="space-y-4">
                  {donations.map((donation) => (
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
                            👤 {donation.donorName || 'Anonymous'} ({donation.isGuest ? 'Guest' : 'Registered'})
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                          {donation.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
                        <div>Quantity: {donation.quantity}</div>
                        <div>Posted: {formatDate(donation.createdAt)}</div>
                        <div>Contact: {donation.contactInfo}</div>
                      </div>

                      {donation.description && (
                        <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded">
                          {donation.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <select
                          value={donation.status}
                          onChange={(e) => handleStatusUpdate(donation.id, 'donations', e.target.value)}
                          className="input text-sm"
                        >
                          <option value="available">Available</option>
                          <option value="claimed">Claimed</option>
                          <option value="completed">Completed</option>
                        </select>
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
                  <p className="text-gray-600">No donations found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              {requests.length > 0 ? (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="card">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {request.foodType.replace('-', ' ')} - {request.quantity}
                          </h3>
                          <p className="text-sm text-gray-600">
                            📍 {request.location}
                          </p>
                          <p className="text-sm text-gray-600">
                            👤 {request.requesterName || 'Anonymous'} ({request.isGuest ? 'Guest' : 'Registered'})
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
                        <div>Urgency: {request.urgency}</div>
                        <div>Posted: {formatDate(request.createdAt)}</div>
                        <div>Contact: {request.contactInfo}</div>
                      </div>

                      {request.description && (
                        <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded">
                          {request.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <select
                          value={request.status}
                          onChange={(e) => handleStatusUpdate(request.id, 'requests', e.target.value)}
                          className="input text-sm"
                        >
                          <option value="open">Open</option>
                          <option value="fulfilled">Fulfilled</option>
                        </select>
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
                  <p className="text-gray-600">No requests found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage