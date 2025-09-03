import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import DonationCard from '../components/common/DonationCard'
import SearchFilters from '../components/common/SearchFilters'
import RequestForm from '../components/common/RequestForm'

const ReceivePage = () => {
  const { currentUser, isGuest } = useAuth()
  const [donations, setDonations] = useState([])
  const [filteredDonations, setFilteredDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('browse') // 'browse' or 'request'
  const [filters, setFilters] = useState({
    search: '',
    status: 'available',
    maxDistance: 25
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

    if (newFilters.search) {
      const searchTerm = newFilters.search.toLowerCase()
      filtered = filtered.filter(donation => 
        donation.foodItem.toLowerCase().includes(searchTerm) ||
        donation.description?.toLowerCase().includes(searchTerm) ||
        donation.location.toLowerCase().includes(searchTerm)
      )
    }

    if (newFilters.status !== 'all') {
      filtered = filtered.filter(donation => donation.status === newFilters.status)
    }

    setFilteredDonations(filtered)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-success-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading available donations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🤝 Request Food Assistance
          </h1>
          <p className="text-gray-600">
            Browse available donations or submit a specific request for help
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-6 py-3 text-sm font-medium rounded-l-lg ${
                activeTab === 'browse'
                  ? 'bg-success-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🍽️ Browse Available Food
            </button>
            <button
              onClick={() => setActiveTab('request')}
              className={`px-6 py-3 text-sm font-medium rounded-r-lg ${
                activeTab === 'request'
                  ? 'bg-success-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 Submit Request
            </button>
          </div>
        </div>

        {activeTab === 'browse' ? (
          <>
            {/* Search and Filters */}
            <SearchFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              totalResults={filteredDonations.length}
            />

            {/* Available Donations */}
            {filteredDonations.length > 0 ? (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                  {filteredDonations.map((donation) => (
                    <DonationCard
                      key={donation.id}
                      donation={donation}
                    />
                  ))}
                </div>

                {/* Help Section */}
                <div className="bg-success-50 border border-success-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="text-3xl mr-4">💡</div>
                    <div>
                      <h3 className="text-lg font-semibold text-success-800 mb-2">
                        How to Request Food
                      </h3>
                      <ul className="text-success-700 space-y-1 text-sm">
                        <li>• Click "Request This Food" on any available donation</li>
                        <li>• Contact the donor using the provided contact information</li>
                        <li>• Arrange a pickup time and location</li>
                        <li>• Be respectful and grateful to our generous donors</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  No available donations found
                </h3>
                <p className="text-gray-600 mb-6">
                  {filters.search 
                    ? `No donations match "${filters.search}". Try adjusting your search.`
                    : 'No donations are currently available. Try submitting a request instead!'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setActiveTab('request')}
                    className="btn-success px-6 py-3"
                  >
                    📝 Submit a Request
                  </button>
                  <button
                    onClick={() => setFilters({...filters, search: ''})}
                    className="btn-secondary px-6 py-3"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="max-w-2xl mx-auto">
            <RequestForm />
          </div>
        )}

        {/* Community Guidelines */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            Community Guidelines
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">For Recipients</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Be respectful and courteous to donors</li>
                <li>• Only request food you actually need</li>
                <li>• Arrive on time for pickup</li>
                <li>• Say thank you - a little gratitude goes a long way</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Need Help?</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Check back regularly for new donations</li>
                <li>• Consider submitting a specific request</li>
                <li>• Join our community to get notifications</li>
                <li>• Spread the word to help others in need</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceivePage