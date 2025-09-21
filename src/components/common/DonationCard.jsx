import React from "react";
import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";

const DonationCard = ({ donation, onApply }) => {
  const { currentUser, isGuest } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  const handleRequest = async () => {
    if (!currentUser && !isGuest) {
      showError("Please sign in or continue as guest to request donations");
      return;
    }

    setIsRequesting(true);
    try {
      await updateDoc(doc(db, "donations", donation.id), {
        status: "claimed",
        claimedBy: currentUser?.uid || "guest",
        claimedAt: serverTimestamp(),
        claimerName: currentUser?.email || "Anonymous",
      });

      showSuccess("Donation requested! Contact the donor to arrange pickup.");
    } catch (error) {
      console.error("Error requesting donation:", error);
      showError("Failed to request donation. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200";
      case "partially_claimed":
        return "bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200";
      case "fully_booked":
        return "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200";
      case "claimed":
        return "bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 border border-orange-200";
      case "completed":
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200";
      default:
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "available":
        return "✅ Available";
      case "partially_claimed":
        return "⚡ Limited Stock";
      case "fully_booked":
        return "🔴 Fully Booked";
      case "claimed":
        return "🔄 Claimed";
      case "completed":
        return "✅ Completed";
      default:
        return status;
    }
  };

  const isUrgent = () => {
    if (!donation.expirationDate) return false;
    const expDate = donation.expirationDate.toDate ? donation.expirationDate.toDate() : new Date(donation.expirationDate);
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
    return expDate <= fiveDaysFromNow;
  };

  const getRemainingQuantity = () => {
    return donation.remainingQuantity || donation.quantity || 0;
  };

  const getOriginalQuantity = () => {
    return donation.originalQuantity || donation.quantity || 0;
  };

  const canApply = (donation.status === "available" || donation.status === "partially_claimed") &&
                   currentUser &&
                   donation.donorId !== currentUser.uid;

  return (
    <>
    <div className={`relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 overflow-hidden ${
      isUrgent() ? 'border-red-300 bg-gradient-to-br from-red-50/90 to-pink-50/90' : 'border-white/40 bg-gradient-to-br from-white/90 to-blue-50/90'
    }`}>

      {/* Urgent Banner */}
      {isUrgent() && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-500 to-pink-500 text-white text-center py-2 text-sm font-bold shadow-lg">
          ⚡ URGENT - Expires Soon!
        </div>
      )}

      <div className={`p-6 ${isUrgent() ? 'pt-16' : ''}`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
                🍽️
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 leading-tight">
                  {donation.foodItem}
                </h3>
                <p className="text-sm text-gray-500 flex items-center">
                  <span className="mr-1">📍</span>
                  {donation.location}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-md ${getStatusColor(donation.status)}`}>
              {getStatusText(donation.status)}
            </span>
            {donation.isUrgent && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                🔥 Urgent
              </span>
            )}
          </div>
        </div>

        {/* Quantity Progress Bar */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/40">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Available Servings</span>
            <span className="text-lg font-bold text-blue-600">
              {getRemainingQuantity()}/{getOriginalQuantity()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                getRemainingQuantity() / getOriginalQuantity() > 0.5
                  ? 'bg-gradient-to-r from-green-400 to-green-500'
                  : getRemainingQuantity() / getOriginalQuantity() > 0.25
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                  : 'bg-gradient-to-r from-red-400 to-red-500'
              }`}
              style={{
                width: `${Math.max(5, (getRemainingQuantity() / getOriginalQuantity()) * 100)}%`
              }}
            ></div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/30">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📅</span>
              <div>
                <p className="text-xs text-gray-500 font-medium">Expires</p>
                <p className="text-sm font-bold text-gray-800">
                  {donation.expirationDate ? formatDate(donation.expirationDate) : 'No expiry'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/30">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⏰</span>
              <div>
                <p className="text-xs text-gray-500 font-medium">Posted</p>
                <p className="text-sm font-bold text-gray-800">
                  {getTimeAgo(donation.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/30 col-span-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg">👤</span>
              <div>
                <p className="text-xs text-gray-500 font-medium">Shared by</p>
                <p className="text-sm font-bold text-gray-800">
                  {donation.donorName || "Anonymous Donor"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {donation.description && (
          <div className="mb-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="mr-2">📝</span>
                Details
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {donation.description}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {canApply ? (
            <div className="space-y-3">
              <button
                onClick={() => onApply && onApply(donation)}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <span>🤝</span>
                <span>Apply for This Food</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex-1 py-3 bg-white/80 hover:bg-white border-2 border-blue-200 hover:border-blue-300 text-blue-700 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  <span>📞</span>
                  <span>Contact</span>
                </button>
                <button
                  className="flex-1 py-3 bg-white/80 hover:bg-white border-2 border-purple-200 hover:border-purple-300 text-purple-700 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  <span>📍</span>
                  <span>Location</span>
                </button>
              </div>
            </div>
          ) : donation.status === "fully_booked" ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-3 shadow-lg">
                🔴
              </div>
              <p className="text-lg font-bold text-red-700 mb-1">Fully Booked</p>
              <p className="text-sm text-red-600">All servings have been claimed</p>
            </div>
          ) : donation.status === "partially_claimed" && !canApply ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-3 shadow-lg">
                ⚡
              </div>
              <p className="text-lg font-bold text-yellow-700 mb-1">Limited Stock</p>
              <p className="text-sm text-yellow-600">Some servings still available</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-slate-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-3 shadow-lg">
                ✅
              </div>
              <p className="text-lg font-bold text-gray-700 mb-1">Not Available</p>
              <p className="text-sm text-gray-600">
                {donation.status === "claimed" ? "This donation has been claimed" : "This donation is completed"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Contact Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl max-w-md w-full p-8 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl mb-4">
                <span className="text-2xl">📞</span>
              </div>
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                Contact Information
              </h3>
              <p className="text-gray-600">
                Get in touch with the donor to arrange pickup
              </p>
              <button
                onClick={() => setShowDetails(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all shadow-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-xl">🍽️</span>
                  <strong className="text-blue-800">Food Item</strong>
                </div>
                <p className="text-blue-700 font-medium">{donation.foodItem}</p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-xl">📍</span>
                  <strong className="text-green-800">Pickup Location</strong>
                </div>
                <p className="text-green-700 font-medium">{donation.location}</p>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-4 border border-orange-100">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-xl">📱</span>
                  <strong className="text-orange-800">Contact Details</strong>
                </div>
                <p className="text-orange-700 font-medium">{donation.contactInfo}</p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-xl">👤</span>
                  <strong className="text-purple-800">Donor</strong>
                </div>
                <p className="text-purple-700 font-medium">{donation.donorName || "Anonymous Donor"}</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">📞</span>
                <h4 className="font-bold text-yellow-800">Next Steps</h4>
              </div>
              <ul className="text-sm text-yellow-700 space-y-2">
                <li>• Contact the donor using the provided information</li>
                <li>• Arrange a convenient pickup time</li>
                <li>• Confirm the exact pickup location</li>
                <li>• Be respectful and grateful for their generosity</li>
              </ul>
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >
              ✅ Got It, Thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DonationCard;
