import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'

const RequestForm = () => {
  const { currentUser, isGuest } = useAuth()
  const { showSuccess, showError } = useNotification()

  const [formData, setFormData] = useState({
    foodType: '',
    quantity: '',
    urgency: 'medium',
    location: '',
    contactInfo: '',
    description: '',
    dietary: ''
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const requestData = {
        ...formData,
        requesterId: currentUser?.uid || 'guest',
        requesterName: currentUser?.email || 'Anonymous Requester',
        isGuest: isGuest || !currentUser,
        status: 'open',
        createdAt: serverTimestamp(),
        fulfilledBy: null,
        fulfilledAt: null
      }

      await addDoc(collection(db, 'requests'), requestData)
      
      showSuccess('Your request has been submitted! Donors will be notified.')
      
      // Reset form
      setFormData({
        foodType: '',
        quantity: '',
        urgency: 'medium',
        location: '',
        contactInfo: '',
        description: '',
        dietary: ''
      })
    } catch (error) {
      console.error('Error submitting request:', error)
      showError('Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          📝 Submit Food Request
        </h2>
        <p className="text-gray-600">
          Let donors know what type of food assistance you need
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Food Type */}
        <div>
          <label htmlFor="foodType" className="block text-sm font-medium text-gray-700 mb-2">
            Type of Food Needed *
          </label>
          <select
            id="foodType"
            name="foodType"
            value={formData.foodType}
            onChange={handleInputChange}
            className="input w-full"
            required
          >
            <option value="">Select food type...</option>
            <option value="fresh-produce">Fresh Fruits & Vegetables</option>
            <option value="grains">Rice, Bread & Grains</option>
            <option value="protein">Meat, Fish & Protein</option>
            <option value="dairy">Milk, Cheese & Dairy</option>
            <option value="canned-goods">Canned & Packaged Foods</option>
            <option value="prepared-meals">Prepared Meals</option>
            <option value="baby-food">Baby Food & Formula</option>
            <option value="any">Any Food Donation</option>
            <option value="other">Other (specify in description)</option>
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
            Quantity Needed *
          </label>
          <input
            type="text"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleInputChange}
            placeholder="e.g., 1-2 meals, 3-4 servings, 1 week supply"
            className="input w-full"
            required
          />
        </div>

        {/* Urgency */}
        <div>
          <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-2">
            Urgency Level *
          </label>
          <select
            id="urgency"
            name="urgency"
            value={formData.urgency}
            onChange={handleInputChange}
            className="input w-full"
            required
          >
            <option value="low">Low - Within a week</option>
            <option value="medium">Medium - Within 2-3 days</option>
            <option value="high">High - Within 24 hours</option>
            <option value="urgent">Urgent - Today</option>
          </select>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Your Location/Area *
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="e.g., Downtown, West End, or specific address"
            className="input w-full"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            This helps donors find requests near them
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
            Donors will use this to coordinate food delivery/pickup
          </p>
        </div>

        {/* Dietary Restrictions */}
        <div>
          <label htmlFor="dietary" className="block text-sm font-medium text-gray-700 mb-2">
            Dietary Restrictions/Preferences (Optional)
          </label>
          <input
            type="text"
            id="dietary"
            name="dietary"
            value={formData.dietary}
            onChange={handleInputChange}
            placeholder="e.g., Vegetarian, Halal, No nuts, Gluten-free"
            className="input w-full"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Details (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            placeholder="Any additional information that would help donors understand your situation..."
            className="input w-full resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Share any relevant details about your needs or circumstances
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Privacy & Safety</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Your request will be visible to registered donors</li>
            <li>• Only share contact information you're comfortable with</li>
            <li>• Meet in public places for food pickup when possible</li>
            <li>• Your personal details are kept confidential</li>
          </ul>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !formData.foodType || !formData.quantity || !formData.location || !formData.contactInfo}
          className="w-full btn-success py-3 text-lg"
        >
          {loading ? 'Submitting...' : '🙏 Submit Request'}
        </button>
      </form>

      {/* Guest Notice */}
      {(isGuest || !currentUser) && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 <strong>Create an account</strong> to manage your requests, track responses, and get personalized notifications when donors respond.
          </p>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">What happens next?</h4>
        <ol className="text-sm text-gray-600 space-y-1">
          <li>1. Your request is posted and donors are notified</li>
          <li>2. Interested donors will contact you directly</li>
          <li>3. Coordinate pickup/delivery with the donor</li>
          <li>4. Mark your request as fulfilled when complete</li>
        </ol>
      </div>
    </div>
  )
}

export default RequestForm