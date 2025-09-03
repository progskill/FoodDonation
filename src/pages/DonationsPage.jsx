import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import DonationCard from '../components/common/DonationCard'
import DonationMap from '../components/common/DonationMap'
import SearchFilters from '../components/common/SearchFilters'

const DonationsPage = () => {
  const [donations, setDonations] = useState([])
  const [filteredDonations, setFilteredDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'map'
  const [filters, setFilters] = useState({
    search: '',
    status: 'available',
    maxDistance: 50 // km
  })

  useEffect(() => {
    const q = query(
      collection(db, 'donations'),
      where('status', '==', 'available'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const donationsData = []
      querySnapshot.forEach((doc) => {
        donationsData.push({
          id: doc.id,
          ...doc.data()
        })
      })
      setDonations(donationsData)
      setFilteredDonations(donationsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    
    let filtered = donations

    // Search filter
    if (newFilters.search) {
      const searchTerm = newFilters.search.toLowerCase()
      filtered = filtered.filter(donation => 
        donation.foodItem.toLowerCase().includes(searchTerm) ||
        donation.description?.toLowerCase().includes(searchTerm) ||
        donation.location.toLowerCase().includes(searchTerm)
      )
    }

    // Status filter
    if (newFilters.status !== 'all') {
      filtered = filtered.filter(donation => donation.status === newFilters.status)
    }

    // Distance filter would require user location and calculation
    // For now, we'll skip the distance filter implementation

    setFilteredDonations(filtered)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading donations...</p>
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
            📋 Available Donations
          </h1>
          <p className="text-gray-600">
            Find food donations available for pickup in your community
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                viewMode === 'map'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🗺️ Map View
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          totalResults={filteredDonations.length}
        />

        {/* Content */}
        {viewMode === 'list' ? (
          <div className="space-y-6">
            {filteredDonations.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredDonations.map((donation) => (
                  <DonationCard
                    key={donation.id}
                    donation={donation}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  No donations found
                </h3>
                <p className="text-gray-600 mb-6">
                  {filters.search 
                    ? `No donations match "${filters.search}". Try adjusting your search.`
                    : 'No donations are currently available. Check back later!'
                  }
                </p>
                <button
                  onClick={() => setFilters({...filters, search: '', status: 'available'})}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <DonationMap donations={filteredDonations} />
          </div>
        )}

        {/* Stats */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Community Impact
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold text-primary-600">
                  {donations.length}
                </div>
                <div className="text-sm text-gray-600">Total Donations</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success-600">
                  {donations.filter(d => d.status === 'available').length}
                </div>
                <div className="text-sm text-gray-600">Available Now</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {donations.filter(d => d.status === 'claimed').length}
                </div>
                <div className="text-sm text-gray-600">Claimed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {donations.filter(d => d.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DonationsPage