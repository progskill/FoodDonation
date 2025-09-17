import React from "react";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import RequestCard from "../components/common/RequestCard";
import SearchFilters from "../components/common/SearchFilters";

const RequestsPage = () => {
  const { currentUser } = useAuth();
  const { showSuccess } = useNotification();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: "open",
    urgency: "all",
  });

  useEffect(() => {
    // Load both regular requests and custom food requests
    const regularRequestsQuery = query(
      collection(db, "requests")
    );

    const customRequestsQuery = query(
      collection(db, "food-requests")
    );

    const unsubscribeRegular = onSnapshot(regularRequestsQuery, (snapshot) => {
      const regularRequests = [];
      snapshot.forEach((doc) => {
        regularRequests.push({
          id: doc.id,
          ...doc.data(),
          type: 'regular'
        });
      });

      const unsubscribeCustom = onSnapshot(customRequestsQuery, (snapshot) => {
        const customRequests = [];
        snapshot.forEach((doc) => {
          customRequests.push({
            id: doc.id,
            ...doc.data(),
            type: 'custom'
          });
        });

        // Combine and sort all requests
        const allRequests = [...regularRequests, ...customRequests];

        // Sort by urgency first, then by creation date
        allRequests.sort((a, b) => {
          // Urgency priority: urgent > high > medium > low
          const urgencyOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          const aUrgency = urgencyOrder[a.urgency] || 1;
          const bUrgency = urgencyOrder[b.urgency] || 1;

          if (aUrgency !== bUrgency) {
            return bUrgency - aUrgency; // Higher urgency first
          }

          // If same urgency, sort by creation date (newest first)
          const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return bDate - aDate;
        });

        setRequests(allRequests);
        setFilteredRequests(allRequests);
        setLoading(false);
      });

      return () => unsubscribeCustom();
    });

    return () => unsubscribeRegular();
  }, []);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);

    let filtered = requests;

    // Search filter
    if (newFilters.search) {
      const searchTerm = newFilters.search.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          (request.foodItem && request.foodItem.toLowerCase().includes(searchTerm)) ||
          (request.foodType && request.foodType.toLowerCase().includes(searchTerm)) ||
          (request.description && request.description.toLowerCase().includes(searchTerm)) ||
          (request.location && request.location.toLowerCase().includes(searchTerm))
      );
    }

    // Status filter
    if (newFilters.status !== "all") {
      filtered = filtered.filter(
        (request) => request.status === newFilters.status
      );
    }

    // Urgency filter
    if (newFilters.urgency && newFilters.urgency !== "all") {
      filtered = filtered.filter(
        (request) => request.urgency === newFilters.urgency
      );
    }

    setFilteredRequests(filtered);
  };

  const handleDonateToRequest = (request) => {
    // Navigate to donate page with request pre-filled
    const requestInfo = {
      targetRequestId: request.id,
      targetRequestType: request.type,
      suggestedFoodItem: request.foodItem || request.foodType?.replace('-', ' '),
      suggestedQuantity: request.quantity,
      requesterLocation: request.location,
      requesterContact: request.contactInfo
    };

    // Store in sessionStorage for the donate page to access
    sessionStorage.setItem('donateToRequest', JSON.stringify(requestInfo));

    // Navigate to donate page
    window.location.href = '/donate';

    showSuccess('Redirecting to donation form with request details...');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl animate-pulse-gentle">🙋‍♀️</span>
            </div>
          </div>
          <p className="mt-6 text-gray-600 text-lg">Loading food requests...</p>
          <p className="mt-2 text-gray-500 text-sm">Finding people who need help</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 mb-4">
            🙋‍♀️ Community Food Requests
          </h1>
          <p className="text-gray-600 text-xl mb-6">
            Help your neighbors by donating specific foods they need
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {requests.filter(r => r.status === 'open').length}
              </div>
              <div className="text-sm text-gray-600">Open Requests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {requests.filter(r => r.urgency === 'urgent').length}
              </div>
              <div className="text-sm text-gray-600">Urgent Needs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {requests.filter(r => r.status === 'fulfilled').length}
              </div>
              <div className="text-sm text-gray-600">Fulfilled</div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔍 Search requests
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
                  placeholder="Search by food type, location, or description..."
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="lg:w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📊 Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                >
                  <option value="all">All Requests</option>
                  <option value="open">Open Requests</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
              </div>

              {/* Urgency Filter */}
              <div className="lg:w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ⚡ Urgency
                </label>
                <select
                  value={filters.urgency}
                  onChange={(e) => handleFilterChange({ ...filters, urgency: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                >
                  <option value="all">All Urgency</option>
                  <option value="urgent">🚨 Urgent</option>
                  <option value="high">⚡ High</option>
                  <option value="medium">📅 Medium</option>
                  <option value="low">🕐 Low</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredRequests.length} of {requests.length} requests
              </p>
              {(filters.search || filters.status !== 'open' || filters.urgency !== 'all') && (
                <button
                  onClick={() => setFilters({ search: "", status: "open", urgency: "all" })}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Requests Grid */}
        {filteredRequests.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredRequests.map((request) => (
              <RequestCard
                key={`${request.type}-${request.id}`}
                request={request}
                onDonate={handleDonateToRequest}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="animate-fade-in">
              <div className="text-8xl mb-8 animate-pulse-gentle">🙋‍♀️</div>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">
                {requests.length === 0 ? "No food requests yet" : "No matching requests"}
              </h3>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                {requests.length === 0 ? (
                  "When community members post food requests, they'll appear here for you to help fulfill."
                ) : filters.search ? (
                  `No requests match "${filters.search}". Try adjusting your search terms or clearing filters.`
                ) : (
                  "No requests match your current filters. Try adjusting your filter settings."
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {requests.length === 0 ? (
                  <div className="text-center">
                    <a href="/receive" className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 mr-4">
                      📝 Submit a Request
                    </a>
                    <a href="/donations" className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                      🍽️ Browse Donations
                    </a>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setFilters({ search: "", status: "open", urgency: "all" })}
                      className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-all"
                    >
                      🔄 Clear Filters
                    </button>
                    <a href="/donate" className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                      🎁 Donate Food Instead
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-16 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-8 border-2 border-white/20">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              🤝 How to Help With Food Requests
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <div className="text-3xl mb-3">🔍</div>
                <h4 className="font-bold text-gray-800 mb-2">1. Browse Requests</h4>
                <p className="text-sm text-gray-600">Look through the food requests from community members in need.</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <div className="text-3xl mb-3">🎁</div>
                <h4 className="font-bold text-gray-800 mb-2">2. Click Donate</h4>
                <p className="text-sm text-gray-600">Click "Donate This Food" on any request you can help with.</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <div className="text-3xl mb-3">📝</div>
                <h4 className="font-bold text-gray-800 mb-2">3. Fill Details</h4>
                <p className="text-sm text-gray-600">Complete the donation form with the requested food information.</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
                <div className="text-3xl mb-3">🤝</div>
                <h4 className="font-bold text-gray-800 mb-2">4. Connect</h4>
                <p className="text-sm text-gray-600">Coordinate with the requester for pickup or delivery.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestsPage;