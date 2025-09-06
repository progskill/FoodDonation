import React from "react";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import DonationCard from "../components/common/DonationCard";
import DonationMap from "../components/common/DonationMap";
import SearchFilters from "../components/common/SearchFilters";

const DonationsPage = () => {
  const { currentUser, isGuest } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [donations, setDonations] = useState([]);
  const [filteredDonations, setFilteredDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'map'
  const [filters, setFilters] = useState({
    search: "",
    status: "available",
    maxDistance: 50, // km
  });
  const [userApplications, setUserApplications] = useState([]);
  const [dailyPickupCount, setDailyPickupCount] = useState(0);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [applicationQuantity, setApplicationQuantity] = useState(1);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [customRequest, setCustomRequest] = useState({
    foodItem: "",
    quantity: "",
    description: "",
    urgency: "normal", // normal, urgent
    location: "",
    contactInfo: "",
  });

  useEffect(() => {
    // Simple query to get all donations first, then filter in memory
    const q = query(
      collection(db, "donations"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const donationsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Ensure we have basic required fields
        if (!data.foodItem) {
          console.log("Skipping document with missing foodItem:", doc.id, data);
          return;
        }
        
        // Calculate remaining quantity and update status if needed
        const originalQuantity = parseInt(data.originalQuantity || data.quantity || 0);
        const remainingQuantity = parseInt(data.remainingQuantity || originalQuantity);
        let status = data.status || "available";
        
        // Update status based on remaining quantity
        if (remainingQuantity <= 0 && status !== "fully_booked") {
          status = "fully_booked";
        } else if (remainingQuantity < originalQuantity && status === "available") {
          status = "partially_claimed";
        }
        
        donationsData.push({
          id: doc.id,
          ...data,
          remainingQuantity,
          originalQuantity,
          status,
        });
      });
      
      console.log("Fetched donations:", donationsData.length, donationsData);
      setDonations(donationsData);
      setFilteredDonations(donationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load user applications and daily pickup count
  useEffect(() => {
    if (currentUser) {
      // Get user's applications from today
      const today = new Date().toISOString().split('T')[0];
      
      // Get all user applications first, then filter by date in memory
      const userApplicationsQuery = query(
        collection(db, "applications"),
        where("applicantId", "==", currentUser.uid)
      );
      
      const unsubscribeApps = onSnapshot(userApplicationsQuery, (snapshot) => {
        const apps = [];
        let totalPickup = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const app = { id: doc.id, ...data };
          apps.push(app);
          
          // Count today's pickups
          if (data.applicationDate === today && (data.status === "approved" || data.status === "completed")) {
            totalPickup += parseInt(data.quantity) || 0;
          }
        });
        
        setUserApplications(apps);
        setDailyPickupCount(totalPickup);
      });
      
      return () => unsubscribeApps();
    } else {
      // For guests, reset the applications
      setUserApplications([]);
      setDailyPickupCount(0);
    }
  }, [currentUser]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);

    let filtered = donations;

    // Search filter
    if (newFilters.search) {
      const searchTerm = newFilters.search.toLowerCase();
      filtered = filtered.filter(
        (donation) =>
          donation.foodItem.toLowerCase().includes(searchTerm) ||
          donation.description?.toLowerCase().includes(searchTerm) ||
          donation.location.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (newFilters.status !== "all") {
      if (newFilters.status === "available") {
        filtered = filtered.filter(
          (donation) => donation.status === "available" || donation.status === "partially_claimed"
        );
      } else {
        filtered = filtered.filter(
          (donation) => donation.status === newFilters.status
        );
      }
    }

    // Distance filter would require user location and calculation
    // For now, we'll skip the distance filter implementation

    setFilteredDonations(filtered);
  };

  const handleApplyForDonation = (donation) => {
    if (!currentUser && !isGuest) {
      showError('Please sign in or continue as guest to apply for donations');
      return;
    }
    
    setSelectedDonation(donation);
    setApplicationQuantity(1);
    setShowApplicationModal(true);
  };

  const submitApplication = async () => {
    if (!selectedDonation) {
      showError('No donation selected');
      return;
    }

    try {
      const userId = currentUser?.uid || `guest_${Date.now()}`;
      const today = new Date().toISOString().split('T')[0]; // Use ISO format for consistency
      
      // Check daily limit (max 30% of total available food per day)
      const totalAvailable = donations.reduce((total, d) => total + (parseInt(d.originalQuantity) || parseInt(d.quantity) || 0), 0);
      const maxDailyPickup = Math.max(5, Math.floor(totalAvailable * 0.3)); // Minimum 5 servings per day
      
      if (dailyPickupCount + applicationQuantity > maxDailyPickup) {
        showError(`Daily pickup limit would be exceeded. You can pick up ${Math.max(0, maxDailyPickup - dailyPickupCount)} more servings today.`);
        return;
      }
      
      // Check if user already applied for this donation
      const existingApplication = userApplications.find(
        app => app.donationId === selectedDonation.id
      );
      
      if (existingApplication) {
        showError('You already applied for this donation.');
        return;
      }
      
      const remainingQty = parseInt(selectedDonation.remainingQuantity) || parseInt(selectedDonation.quantity) || 0;
      if (applicationQuantity > remainingQty) {
        showError('Not enough quantity available.');
        return;
      }
      
      // Create application with simpler structure
      const applicationData = {
        donationId: selectedDonation.id,
        applicantId: userId,
        applicantName: currentUser?.email || currentUser?.displayName || 'Anonymous',
        quantity: parseInt(applicationQuantity),
        applicationDate: today,
        status: 'approved', // Auto-approve for now, can be changed to 'pending' for manual approval
        createdAt: serverTimestamp(),
        donationTitle: selectedDonation.foodItem,
        donorId: selectedDonation.donorId,
        donorContact: selectedDonation.contactInfo,
        pickupLocation: selectedDonation.location,
      };
      
      // Update donation document
      const newRemainingQuantity = Math.max(0, remainingQty - applicationQuantity);
      let newStatus = selectedDonation.status;
      
      if (newRemainingQuantity === 0) {
        newStatus = 'fully_booked';
      } else if (newRemainingQuantity < (parseInt(selectedDonation.originalQuantity) || parseInt(selectedDonation.quantity) || 0)) {
        newStatus = 'partially_claimed';
      }
      
      await updateDoc(doc(db, 'donations', selectedDonation.id), {
        applicants: arrayUnion({
          applicantId: userId,
          applicantName: applicationData.applicantName,
          quantity: parseInt(applicationQuantity),
          appliedAt: serverTimestamp(),
          status: 'approved'
        }),
        remainingQuantity: newRemainingQuantity,
        status: newStatus,
        lastUpdated: serverTimestamp(),
      });
      
      // Add to applications collection
      await addDoc(collection(db, 'applications'), applicationData);
      
      showSuccess(`Application submitted for ${applicationQuantity} serving(s)! Contact the donor to arrange pickup.`);
      setShowApplicationModal(false);
      
      // Reset form
      setApplicationQuantity(1);
      setSelectedDonation(null);
      
    } catch (error) {
      console.error('Error submitting application:', error);
      console.error('Error details:', error.message);
      console.error('Selected donation:', selectedDonation);
      console.error('Application data:', {
        donationId: selectedDonation?.id,
        userId,
        applicationQuantity,
        today
      });
      
      // Show more specific error message
      let errorMessage = 'Failed to submit application. ';
      if (error.code === 'permission-denied') {
        errorMessage += 'Permission denied. Please check your Firebase security rules.';
      } else if (error.code === 'unavailable') {
        errorMessage += 'Service unavailable. Please try again later.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      showError(errorMessage);
    }
  };

  const handleCustomRequestInputChange = (e) => {
    const { name, value } = e.target;
    setCustomRequest(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const submitCustomRequest = async () => {
    try {
      const userId = currentUser?.uid || 'guest';
      
      // Validate required fields
      if (!customRequest.foodItem || !customRequest.quantity || !customRequest.contactInfo) {
        showError('Please fill in all required fields');
        return;
      }

      const requestData = {
        ...customRequest,
        requesterId: userId,
        requesterName: currentUser?.email || 'Anonymous',
        isGuest: isGuest || !currentUser,
        status: 'open',
        createdAt: serverTimestamp(),
        matchedDonations: [],
        interestedDonors: [],
        type: 'custom_request'
      };

      // Add to food-requests collection
      await addDoc(collection(db, 'food-requests'), requestData);

      showSuccess('Your food request has been posted! Donors in your area will be notified.');
      setShowRequestModal(false);
      setCustomRequest({
        foodItem: "",
        quantity: "",
        description: "",
        urgency: "normal",
        location: "",
        contactInfo: "",
      });
    } catch (error) {
      console.error('Error submitting custom request:', error);
      showError('Failed to submit request. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'partially_claimed': return 'bg-yellow-100 text-yellow-800';
      case 'fully_booked': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return '✅ Available';
      case 'partially_claimed': return '⚡ Limited Stock';
      case 'fully_booked': return '🔴 Fully Booked';
      case 'completed': return '✅ Completed';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl animate-pulse-gentle">🍎</span>
            </div>
          </div>
          <p className="mt-6 text-gray-600 text-lg">Finding delicious donations...</p>
          <p className="mt-2 text-gray-500 text-sm">Connecting you with your community</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-4">
            🍽️ Community Food Share
          </h1>
          <p className="text-gray-600 text-xl mb-6">
            Discover and apply for food donations in your neighborhood
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              🙋‍♀️ Request Specific Food
            </button>
          </div>
          
          {/* Daily Limit Info */}
          {currentUser && (
            <div className="inline-flex items-center bg-white/70 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-white/20 mb-6">
              <span className="text-2xl mr-3">📊</span>
              <div className="text-left">
                <div className="font-semibold text-gray-800">
                  Daily Pickup: {dailyPickupCount}/
                  {Math.floor(donations.reduce((total, d) => total + (d.originalQuantity || d.quantity || 0), 0) * 0.3)} servings
                </div>
                <div className="text-xs text-gray-600">Resets every day at midnight</div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced View Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-2xl border-2 border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg">
            <button
              onClick={() => setViewMode("list")}
              className={`px-6 py-3 text-sm font-semibold rounded-l-2xl transition-all duration-300 ${
                viewMode === "list"
                  ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg transform scale-105"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              📋 List View
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-6 py-3 text-sm font-semibold rounded-r-2xl transition-all duration-300 ${
                viewMode === "map"
                  ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg transform scale-105"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
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
        {viewMode === "list" ? (
          <div className="space-y-8">
            {filteredDonations.length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredDonations.map((donation) => (
                  <EnhancedDonationCard 
                    key={donation.id} 
                    donation={donation} 
                    onApply={() => handleApplyForDonation(donation)}
                    userApplications={userApplications}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="animate-fade-in">
                  <div className="text-8xl mb-8 animate-pulse-gentle">🍽️</div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-4">
                    {donations.length === 0 ? "No donations yet" : "No matching donations"}
                  </h3>
                  <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                    {donations.length === 0 ? (
                      <>Your community food sharing journey is just beginning! 
                      Be the first to share the love by donating some food.</>
                    ) : filters.search ? (
                      <>No donations match "{filters.search}". 
                      Try adjusting your search terms or clearing filters.</>
                    ) : (
                      "All donations have been claimed for now. Check back later for new opportunities to help your community!"
                    )}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {donations.length === 0 ? (
                      <button className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                        🎁 Make the First Donation
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            setFilters({ ...filters, search: "", status: "available" })
                          }
                          className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-all"
                        >
                          🔄 Clear Filters
                        </button>
                        <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                          🎁 Donate Food Instead
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
            <DonationMap donations={filteredDonations} />
          </div>
        )}

        {/* Enhanced Stats */}
        <div className="mt-16 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 border-2 border-white/20">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-8">
              🌟 Community Impact Dashboard
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {donations.length}
                </div>
                <div className="text-sm font-semibold text-gray-700">Total Donations</div>
                <div className="text-xs text-gray-500 mt-1">🎁 Shared with love</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {donations.filter((d) => d.status === "available" || d.status === "partially_claimed").length}
                </div>
                <div className="text-sm font-semibold text-gray-700">Available Now</div>
                <div className="text-xs text-gray-500 mt-1">✨ Ready for pickup</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {donations.filter((d) => d.status === "partially_claimed").length}
                </div>
                <div className="text-sm font-semibold text-gray-700">Partially Claimed</div>
                <div className="text-xs text-gray-500 mt-1">⚡ Limited stock</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {donations.filter((d) => d.status === "fully_booked").length}
                </div>
                <div className="text-sm font-semibold text-gray-700">Fully Booked</div>
                <div className="text-xs text-gray-500 mt-1">🔴 All claimed</div>
              </div>
            </div>
            
            {/* Additional Impact Metrics */}
            <div className="mt-8 pt-6 border-t border-white/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-2xl">🥄</span>
                  <div className="mt-2 font-semibold text-gray-700">
                    {donations.reduce((total, d) => total + (d.originalQuantity || d.quantity || 0), 0)} Total Servings
                  </div>
                </div>
                <div>
                  <span className="text-2xl">👥</span>
                  <div className="mt-2 font-semibold text-gray-700">
                    {donations.reduce((total, d) => total + (d.applicants?.length || 0), 0)} Applications
                  </div>
                </div>
                <div>
                  <span className="text-2xl">❤️</span>
                  <div className="mt-2 font-semibold text-gray-700">
                    {donations.filter(d => d.donorName && !d.isGuest).length} Registered Donors
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Application Modal */}
        {showApplicationModal && selectedDonation && (
          <ApplicationModal 
            donation={selectedDonation}
            applicationQuantity={applicationQuantity}
            setApplicationQuantity={setApplicationQuantity}
            onSubmit={submitApplication}
            onClose={() => setShowApplicationModal(false)}
            maxDailyPickup={Math.floor(donations.reduce((total, d) => total + (d.originalQuantity || d.quantity || 0), 0) * 0.3)}
            currentDailyCount={dailyPickupCount}
          />
        )}
        
        {/* Custom Request Modal */}
        {showRequestModal && (
          <CustomRequestModal
            customRequest={customRequest}
            onInputChange={handleCustomRequestInputChange}
            onSubmit={submitCustomRequest}
            onClose={() => setShowRequestModal(false)}
          />
        )}
      </div>
    </div>
  );
};

// Enhanced Donation Card Component
const EnhancedDonationCard = ({ donation, onApply, userApplications, getStatusColor, getStatusText }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const userApplied = userApplications.some(app => app.donationId === donation.id);
  const canApply = donation.status === "available" || donation.status === "partially_claimed";
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };
  
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
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
  
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {donation.foodItem}
            </h3>
            <p className="text-sm text-gray-600 flex items-center">
              <span className="mr-1">📍</span>
              {donation.location}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(donation.status)}`}>
            {getStatusText(donation.status)}
          </span>
        </div>
        
        {/* Quantity Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Available: {donation.remainingQuantity}/{donation.originalQuantity || donation.quantity}</span>
            <span>{Math.round((donation.remainingQuantity / (donation.originalQuantity || donation.quantity)) * 100)}% left</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, (donation.remainingQuantity / (donation.originalQuantity || donation.quantity)) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Details */}
      <div className="px-6 space-y-3 text-sm text-gray-600">
        {donation.expirationDate && (
          <div className="flex items-center">
            <span className="w-4 h-4 mr-3">📅</span>
            <span>Best before: {formatDate(donation.expirationDate)}</span>
          </div>
        )}
        <div className="flex items-center">
          <span className="w-4 h-4 mr-3">👤</span>
          <span>Donor: {donation.donorName || 'Anonymous'}</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 mr-3">⏰</span>
          <span>Posted: {getTimeAgo(donation.createdAt)}</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 mr-3">👥</span>
          <span>Applications: {donation.applicants?.length || 0}</span>
        </div>
      </div>
      
      {/* Description */}
      {donation.description && (
        <div className="p-6 pt-4">
          <div className="bg-gray-50/70 p-4 rounded-xl text-sm text-gray-700">
            {donation.description}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="p-6 pt-4 flex flex-col sm:flex-row gap-3">
        {canApply && !userApplied ? (
          <>
            <button
              onClick={onApply}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              🤝 Apply for This Food
            </button>
            <button
              onClick={() => setShowDetails(true)}
              className="bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:border-gray-400 transition-all"
            >
              📞 Contact
            </button>
          </>
        ) : userApplied ? (
          <div className="flex-1 text-center py-3 bg-blue-50 text-blue-700 font-semibold rounded-xl">
            ✅ Application Submitted
          </div>
        ) : (
          <div className="flex-1 text-center py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl">
            {donation.status === 'fully_booked' ? '🔴 Fully Booked' : '⏳ Not Available'}
          </div>
        )}
      </div>
      
      {/* Contact Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Contact Information</h3>
              <button 
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <strong className="text-gray-800">Food Item:</strong>
                <p className="text-gray-600">{donation.foodItem}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <strong className="text-gray-800">Pickup Location:</strong>
                <p className="text-gray-600">{donation.location}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <strong className="text-gray-800">Contact:</strong>
                <p className="text-gray-600">{donation.contactInfo}</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800">
                <strong>📞 Next Steps:</strong><br />
                Contact the donor to coordinate pickup and get detailed directions.
              </p>
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="w-full mt-6 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold py-3 rounded-xl"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Application Modal Component
const ApplicationModal = ({ donation, applicationQuantity, setApplicationQuantity, onSubmit, onClose, maxDailyPickup, currentDailyCount }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Apply for Food</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Donation Info */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl">
            <h4 className="font-semibold text-gray-800 mb-2">{donation.foodItem}</h4>
            <p className="text-sm text-gray-600">📍 {donation.location}</p>
            <p className="text-sm text-gray-600">Available: {donation.remainingQuantity} servings</p>
          </div>
          
          {/* Quantity Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              How many servings would you like?
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setApplicationQuantity(Math.max(1, applicationQuantity - 1))}
                className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-all"
              >
                −
              </button>
              <div className="text-2xl font-bold text-gray-800 min-w-12 text-center">
                {applicationQuantity}
              </div>
              <button
                onClick={() => setApplicationQuantity(Math.min(donation.remainingQuantity, maxDailyPickup - currentDailyCount, applicationQuantity + 1))}
                className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-all"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Daily limit: {currentDailyCount + applicationQuantity}/{maxDailyPickup} servings
            </p>
          </div>
          
          {/* Guidelines */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <h4 className="font-semibold text-yellow-800 mb-2">📋 Pickup Guidelines</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Contact the donor within 24 hours</li>
              <li>• Be respectful and punctual</li>
              <li>• Bring your own containers if needed</li>
            </ul>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={applicationQuantity > donation.remainingQuantity || currentDailyCount + applicationQuantity > maxDailyPickup}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Submit Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom Request Modal Component
const CustomRequestModal = ({ customRequest, onInputChange, onSubmit, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
            🙋‍♀️ Request Specific Food
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl">
            <p className="text-sm text-orange-800">
              <strong>💡 How it works:</strong> Can't find what you need? Post a request and donors in your area will be notified!
            </p>
          </div>
          
          {/* Food Item */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              🍽️ What food are you looking for? *
            </label>
            <input
              type="text"
              name="foodItem"
              value={customRequest.foodItem}
              onChange={onInputChange}
              placeholder="e.g., Baby formula, Gluten-free bread, Fresh vegetables"
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
              required
            />
          </div>
          
          {/* Quantity and Urgency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📊 How much? *
              </label>
              <input
                type="text"
                name="quantity"
                value={customRequest.quantity}
                onChange={onInputChange}
                placeholder="e.g., 2 cans, 1 bag, 5 servings"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                ⚡ Urgency
              </label>
              <select
                name="urgency"
                value={customRequest.urgency}
                onChange={onInputChange}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
              >
                <option value="normal">📅 Normal</option>
                <option value="urgent">🚨 Urgent</option>
              </select>
            </div>
          </div>
          
          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              📍 Your area (optional)
            </label>
            <input
              type="text"
              name="location"
              value={customRequest.location}
              onChange={onInputChange}
              placeholder="e.g., Downtown, Near Central Park, ZIP code"
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
            />
            <p className="text-xs text-gray-600 mt-2">
              💡 Help donors find you easier by sharing your general area
            </p>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              📝 Additional details (optional)
            </label>
            <textarea
              name="description"
              value={customRequest.description}
              onChange={onInputChange}
              rows={3}
              placeholder="Why do you need this food? Any dietary restrictions? When do you need it by?"
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none"
            />
          </div>
          
          {/* Contact Info */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              📞 Contact Information *
            </label>
            <input
              type="text"
              name="contactInfo"
              value={customRequest.contactInfo}
              onChange={onInputChange}
              placeholder="Phone number, email, or preferred contact method"
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
              required
            />
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                🔒 <strong>Privacy:</strong> Only interested donors will see your contact info
              </p>
            </div>
          </div>
          
          {/* Guidelines */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <h4 className="font-semibold text-yellow-800 mb-2">📋 Request Guidelines</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Be specific about what you need</li>
              <li>• Respond to donors within 24 hours</li>
              <li>• Be flexible with pickup times</li>
              <li>• Say thank you - kindness goes a long way! 💛</li>
            </ul>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!customRequest.foodItem || !customRequest.quantity || !customRequest.contactInfo}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              🚀 Post Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationsPage;
