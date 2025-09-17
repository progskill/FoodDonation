import React from "react";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";

const RequestCard = ({ request, onDonate }) => {
  const { currentUser, isGuest } = useAuth();
  const { showError } = useNotification();
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "";
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

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case "urgent":
        return "🚨";
      case "high":
        return "⚡";
      case "medium":
        return "📅";
      case "low":
        return "🕐";
      default:
        return "📝";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800";
      case "fulfilled":
        return "bg-blue-100 text-blue-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDonate = () => {
    if (!currentUser && !isGuest) {
      showError("Please sign in or continue as guest to donate");
      return;
    }

    onDonate(request);
  };

  const isOwnRequest = currentUser && request.requesterId === currentUser.uid;
  const canDonate = request.status === "open" && !isOwnRequest;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Urgency Banner */}
      {(request.urgency === "urgent" || request.urgency === "high") && (
        <div
          className={`px-4 py-2 text-sm font-bold text-center ${
            request.urgency === "urgent"
              ? "bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse"
              : "bg-gradient-to-r from-orange-500 to-yellow-500 text-white"
          }`}
        >
          {getUrgencyIcon(request.urgency)} {request.urgency.toUpperCase()}{" "}
          REQUEST
        </div>
      )}

      {/* Header */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {request.foodItem ||
                request.foodType?.replace("-", " ") ||
                "Food Request"}
            </h3>
            <p className="text-sm text-gray-600 flex items-center mb-2">
              <span className="mr-1">📍</span>
              {request.location || "Location not specified"}
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getUrgencyColor(
                  request.urgency
                )}`}
              >
                {getUrgencyIcon(request.urgency)} {request.urgency || "normal"}{" "}
                priority
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                  request.status
                )}`}
              >
                {request.status === "open"
                  ? "🟢 Open"
                  : request.status === "fulfilled"
                  ? "✅ Fulfilled"
                  : "❌ Closed"}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <span className="w-4 h-4 mr-3">📦</span>
            <span>Quantity needed: {request.quantity}</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 mr-3">👤</span>
            <span>
              Requested by:{" "}
              {request.requesterName || request.applicantName || "Anonymous"}
            </span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 mr-3">⏰</span>
            <span>Posted: {getTimeAgo(request.createdAt)}</span>
          </div>
          {request.interestedDonors && request.interestedDonors.length > 0 && (
            <div className="flex items-center">
              <span className="w-4 h-4 mr-3">❤️</span>
              <span>Interested donors: {request.interestedDonors.length}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {request.description && (
          <div className="mb-4">
            <div className="bg-gray-50/70 p-4 rounded-xl text-sm text-gray-700">
              <strong className="text-gray-800">Additional details:</strong>
              <br />
              {request.description}
            </div>
          </div>
        )}

        {/* Dietary restrictions */}
        {request.dietary && (
          <div className="mb-4">
            <div className="bg-orange-50/70 p-3 rounded-xl text-sm">
              <strong className="text-orange-800">🍽️ Dietary needs:</strong>
              <span className="text-orange-700 ml-2">{request.dietary}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isOwnRequest ? (
            <div className="flex-1 text-center py-3 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 font-semibold rounded-xl border-2 border-blue-200">
              📝 Your Request - Cannot Donate
            </div>
          ) : canDonate ? (
            <>
              <button
                onClick={handleDonate}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                🎁 Donate This Food
              </button>
              <button
                onClick={() => setShowDetails(true)}
                className="bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:border-gray-400 transition-all"
              >
                📞 Contact
              </button>
            </>
          ) : (
            <div className="flex-1 text-center py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl">
              {request.status === "fulfilled"
                ? "✅ Already Fulfilled"
                : "❌ Not Available"}
            </div>
          )}
        </div>
      </div>

      {/* Contact Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Contact Requester</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <strong className="text-gray-800">Requested Item:</strong>
                <p className="text-gray-600">
                  {request.foodItem || request.foodType?.replace("-", " ")}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <strong className="text-gray-800">Quantity:</strong>
                <p className="text-gray-600">{request.quantity}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <strong className="text-gray-800">Contact Info:</strong>
                <p className="text-gray-600">{request.contactInfo}</p>
              </div>
              {request.location && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <strong className="text-gray-800">Location:</strong>
                  <p className="text-gray-600">{request.location}</p>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-800">
                <strong>🤝 Next Steps:</strong>
                <br />
                Contact the person to coordinate donation delivery/pickup and
                timing.
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

export default RequestCard;
