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
import { useHousehold } from "../hooks/useHousehold";
import DonationCard from "../components/common/DonationCard";
import DonationMap from "../components/common/DonationMap";
import SearchFilters from "../components/common/SearchFilters";
import HouseholdRegistration from "../components/common/HouseholdRegistration";
import ProtectedRoute from "../components/auth/ProtectedRoute";

// Helper function to check if donation is urgent (expires within 5 days)
const checkIfUrgent = (expirationDate) => {
  if (!expirationDate) return false;
  
  const expDate = expirationDate.toDate ? expirationDate.toDate() : new Date(expirationDate);
  const now = new Date();
  const fiveDaysFromNow = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
  
  return expDate <= fiveDaysFromNow;
};

const DonationsPage = () => {
  const { currentUser, isGuest } = useAuth();
  const { showSuccess, showError } = useNotification();
  const { 
    household, 
    hasHousehold, 
    canApplyForDonations,
    getMaxDonationPercentage,
    getHouseholdSize,
    isLargeHousehold 
  } = useHousehold();
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
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);
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
        
        // Calculate if donation is urgent based on expiration
        const isUrgent = checkIfUrgent(data.expirationDate);
        
        donationsData.push({
          id: doc.id,
          ...data,
          remainingQuantity,
          originalQuantity,
          status,
          isUrgent,
        });
      });
      
      // Sort donations: urgent ones first, then by creation date
      donationsData.sort((a, b) => {
        // Urgent donations first
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        
        // Then by creation date (newest first)
        const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bDate - aDate;
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
    if (currentUser && household) {
      // Get user's applications from today
      const today = new Date().toISOString().split('T')[0];
      
      // Get all household applications first, then filter by date in memory
      const householdApplicationsQuery = query(
        collection(db, "applications"),
        where("householdId", "==", household.id)
      );
      
      const unsubscribeApps = onSnapshot(householdApplicationsQuery, (snapshot) => {
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
      // For users without household or guests, reset the applications
      setUserApplications([]);
      setDailyPickupCount(0);
    }
  }, [currentUser, household]);

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
    
    // SECURITY: Prevent users from applying to their own donations
    if (currentUser && donation.donorId === currentUser.uid) {
      showError('You cannot apply for your own donations. You are the donor of this item.');
      return;
    }
    
    // Check if user has registered a household
    if (!hasHousehold) {
      showError('Please register your household before applying for donations');
      setShowHouseholdModal(true);
      return;
    }
    
    // Check if user can apply for donations (is registrant or authorized member)
    if (!canApplyForDonations()) {
      showError('You are not authorized to apply for donations on behalf of your household');
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

    // SECURITY FAILSAFE: Double-check that user is not applying to their own donation
    if (currentUser && selectedDonation.donorId === currentUser.uid) {
      showError('Security error: You cannot apply for your own donations.');
      setShowApplicationModal(false);
      return;
    }

    const userId = currentUser?.uid || `guest_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0]; // Use ISO format for consistency

    try {
      
      // Check daily limit (max 30% of total available food per day)
      const totalAvailable = donations.reduce((total, d) => total + (parseInt(d.originalQuantity) || parseInt(d.quantity) || 0), 0);
      const maxDailyPickup = Math.max(5, Math.floor(totalAvailable * 0.3)); // Minimum 5 servings per day
      
      if (dailyPickupCount + applicationQuantity > maxDailyPickup) {
        showError(`Daily pickup limit would be exceeded. You can pick up ${Math.max(0, maxDailyPickup - dailyPickupCount)} more servings today.`);
        return;
      }
      
      // Check if household already applied for this donation
      const existingApplication = userApplications.find(
        app => app.donationId === selectedDonation.id
      );
      
      if (existingApplication) {
        showError('Your household has already applied for this donation.');
        return;
      }
      
      const remainingQty = parseInt(selectedDonation.remainingQuantity) || parseInt(selectedDonation.quantity) || 0;
      const originalQty = parseInt(selectedDonation.originalQuantity) || parseInt(selectedDonation.quantity) || 0;
      
      // Calculate max allowed per household for this donation (30%/35% rule with small amount exception)
      const householdPercentage = getMaxDonationPercentage(); // 30% or 35% based on household size
      let maxAllowedForThisDonation;
      if (remainingQty <= 3) {
        // Small amount exception: allow up to remaining quantity
        maxAllowedForThisDonation = remainingQty;
      } else {
        // Apply percentage rule based on original quantity and household size
        maxAllowedForThisDonation = Math.max(1, Math.ceil(originalQty * householdPercentage));
      }
      
      if (applicationQuantity > remainingQty) {
        showError('Not enough quantity available.');
        return;
      }
      
      if (applicationQuantity > maxAllowedForThisDonation) {
        const percentageNote = remainingQty <= 3 ? '' : ` (${Math.round(householdPercentage * 100)}% of original ${originalQty} for ${isLargeHousehold() ? 'large' : 'regular'} household)`;
        showError(`Maximum ${maxAllowedForThisDonation} serving(s) allowed per household for this donation${percentageNote}.`);
        return;
      }
      
      // Create application with household structure
      const applicationData = {
        donationId: selectedDonation.id,
        applicantId: userId,
        applicantName: currentUser?.email || currentUser?.displayName || 'Anonymous',
        householdId: household.id,
        householdName: household.householdName,
        householdSize: getHouseholdSize(),
        isLargeHousehold: isLargeHousehold(),
        maxPercentage: Math.round(householdPercentage * 100),
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
          householdId: household.id,
          householdName: household.householdName,
          householdSize: getHouseholdSize(),
          quantity: parseInt(applicationQuantity),
          appliedAt: new Date().toISOString(),
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
    <ProtectedRoute message="You need to create an account to browse and apply for food donations. This helps us ensure fair distribution and verify legitimate applications.">
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
            {!hasHousehold && currentUser && (
              <button
                onClick={() => setShowHouseholdModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                👥 Register Household
              </button>
            )}
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              🙋‍♀️ Request Specific Food
            </button>
            {hasHousehold && (
              <button
                onClick={() => setShowHouseholdModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                ✏️ Edit Household
              </button>
            )}
          </div>
          
          {/* Daily Limit Info */}
          {currentUser && hasHousehold && (
            <div className="inline-flex items-center bg-white/70 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-white/20 mb-6">
              <span className="text-2xl mr-3">📊</span>
              <div className="text-left">
                <div className="font-semibold text-gray-800">
                  Daily Pickup: {dailyPickupCount}/
                  {Math.floor(donations.reduce((total, d) => total + (d.originalQuantity || d.quantity || 0), 0) * 0.3)} servings
                </div>
                <div className="text-xs text-gray-600">
                  Household: {household?.householdName} ({getHouseholdSize()} members)
                  {isLargeHousehold() && <span className="text-green-600 font-medium"> • 35% Max Limit</span>}
                </div>
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
                  <DonationCard
                    key={donation.id}
                    donation={donation}
                    onApply={() => handleApplyForDonation(donation)}
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
        
        {/* Enhanced Application Modal */}
        {showApplicationModal && selectedDonation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl mb-4">
                  <span className="text-2xl">🤝</span>
                </div>
                <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-2">
                  Apply for Food Donation
                </h3>
                <p className="text-gray-600">
                  Help us ensure fair distribution by specifying your household needs
                </p>
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all shadow-lg"
                >
                  ×
                </button>
              </div>

              {/* Donation Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6 border border-blue-100">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                    🍽️
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-blue-800">{selectedDonation.foodItem}</h4>
                    <p className="text-sm text-blue-600 flex items-center">
                      <span className="mr-1">📍</span>
                      {selectedDonation.location}
                    </p>
                    <p className="text-sm text-blue-600 flex items-center mt-1">
                      <span className="mr-1">📊</span>
                      {selectedDonation.remainingQuantity || selectedDonation.quantity} servings available
                    </p>
                  </div>
                </div>
              </div>

              {/* Quantity Selection */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                  <span className="mr-2">🥄</span>
                  How many servings do you need?
                </label>
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40">
                  <input
                    type="number"
                    value={applicationQuantity}
                    onChange={(e) => setApplicationQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                    max={selectedDonation.remainingQuantity || selectedDonation.quantity}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-center text-2xl font-bold text-gray-800"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Minimum: 1</span>
                    <span>Maximum: {selectedDonation.remainingQuantity || selectedDonation.quantity}</span>
                  </div>
                </div>
              </div>

              {/* Household Info */}
              {household && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-6 border border-green-100">
                  <h4 className="font-bold text-green-800 mb-2 flex items-center">
                    <span className="mr-2">🏠</span>
                    Your Household
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Name:</strong> {household.householdName}</p>
                    <p><strong>Size:</strong> {Object.keys(household.members || {}).length} members</p>
                    <p><strong>Daily Pickup:</strong> {dailyPickupCount} servings today</p>
                  </div>
                </div>
              )}

              {/* Application Guidelines */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-2xl">📋</span>
                  <h4 className="font-bold text-yellow-800">Application Guidelines</h4>
                </div>
                <ul className="text-sm text-yellow-700 space-y-2">
                  <li>• Applications are reviewed to ensure fair distribution</li>
                  <li>• Contact the donor within 24 hours if approved</li>
                  <li>• Be flexible with pickup times</li>
                  <li>• Express gratitude - kindness builds community! 💛</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="flex-1 py-4 bg-white/80 hover:bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitApplication}
                  disabled={!applicationQuantity || applicationQuantity < 1}
                  className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                  🤝 Submit Application
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Household Registration Modal */}
        {showHouseholdModal && (
          <HouseholdRegistration
            onComplete={() => {
              setShowHouseholdModal(false);
              showSuccess('Household registered successfully! You can now apply for donations.');
            }}
            onClose={() => setShowHouseholdModal(false)}
            existingHousehold={household}
          />
        )}
        
        {/* Custom Request Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Request Specific Food</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Food Item *
                  </label>
                  <input
                    type="text"
                    name="foodItem"
                    value={customRequest.foodItem}
                    onChange={handleCustomRequestInputChange}
                    placeholder="e.g., Fresh vegetables, Rice, Bread"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="text"
                    name="quantity"
                    value={customRequest.quantity}
                    onChange={handleCustomRequestInputChange}
                    placeholder="e.g., 5 servings, 2-3 meals"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={customRequest.location}
                    onChange={handleCustomRequestInputChange}
                    placeholder="Your area or pickup preference"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Info *
                  </label>
                  <input
                    type="text"
                    name="contactInfo"
                    value={customRequest.contactInfo}
                    onChange={handleCustomRequestInputChange}
                    placeholder="Phone number or email"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={customRequest.description}
                    onChange={handleCustomRequestInputChange}
                    placeholder="Additional details about your request"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500"
                    rows="3"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCustomRequest}
                  disabled={!customRequest.foodItem || !customRequest.quantity || !customRequest.contactInfo}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  Post Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
};

export default DonationsPage;