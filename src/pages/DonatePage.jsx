import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import LocationPicker from '../components/common/LocationPicker'

const DonatePage = () => {
  const { currentUser, isGuest } = useAuth()
  const { showSuccess, showError, notifyNewDonation } = useNotification()

  const [formData, setFormData] = useState({
    foodItem: '',
    quantity: '',
    expirationDate: '',
    description: '',
    location: '',
    contactInfo: '',
    coordinates: null
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLocationSelect = (location, coordinates) => {
    setFormData(prev => ({
      ...prev,
      location,
      coordinates
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const donationData = {
        ...formData,
        donorId: currentUser?.uid || 'guest',
        donorName: currentUser?.email || 'Anonymous Donor',
        isGuest: isGuest || !currentUser,
        status: 'available',
        createdAt: serverTimestamp(),
        claimedBy: null,
        claimedAt: null
      }

      const docRef = await addDoc(collection(db, 'donations'), donationData)
      
      showSuccess('Your donation has been posted successfully!')
      notifyNewDonation({ ...donationData, id: docRef.id })
      
      setFormData({
        foodItem: '',
        quantity: '',
        expirationDate: '',
        description: '',
        location: '',
        contactInfo: '',
        coordinates: null
      })
    } catch (error) {
      console.error('Error adding donation:', error)
      showError('Failed to post donation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🍎 Donate Food
            </h1>
            <p className="text-gray-600">
              Share your extra food with people in need in your community
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Food Item */}
            <div>
              <label htmlFor="foodItem" className="block text-sm font-medium text-gray-700 mb-2">
                Food Item *
              </label>
              <input
                type="text"
                id="foodItem"
                name="foodItem"
                value={formData.foodItem}
                onChange={handleInputChange}
                placeholder="e.g., Fresh vegetables, Cooked rice, Bread loaves"
                className="input w-full"
                required
              />
            </div>

            {/* Quantity */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantity/Servings *
              </label>
              <input
                type="text"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="e.g., 5 servings, 2 bags, 10 pieces"
                className="input w-full"
                required
              />
            </div>

            {/* Expiration Date */}
            <div>
              <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date (Optional)
              </label>
              <input
                type="date"
                id="expirationDate"
                name="expirationDate"
                value={formData.expirationDate}
                onChange={handleInputChange}
                className="input w-full"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional details about the food, dietary information, etc."
                className="input w-full resize-none"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Location *
              </label>
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                initialLocation={formData.location}
              />
              <p className="text-xs text-gray-500 mt-1">
                Click on the map to set pickup location or search for an address
              </p>
            </div>

            {/* Contact Info */}
            <div>
              <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Information *
              </label>
              <input
                type="text"
                id="contactInfo"
                name="contactInfo"
                value={formData.contactInfo}
                onChange={handleInputChange}
                placeholder="Phone number or preferred contact method"
                className="input w-full"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be shared with people who request your donation
              </p>
            </div>

            {/* Terms */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Terms & Guidelines</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Ensure food is safe and fresh</li>
                <li>• Be available for pickup coordination</li>
                <li>• Respond to requests within 24 hours</li>
                <li>• Update status if no longer available</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !formData.foodItem || !formData.quantity || !formData.location || !formData.contactInfo}
              className="w-full btn-primary py-3 text-lg"
            >
              {loading ? 'Posting...' : '🎁 Post Donation'}
            </button>
          </form>

          {/* Guest Notice */}
          {(isGuest || !currentUser) && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Create an account to manage your donations, track requests, and get notifications when someone claims your food.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DonatePage