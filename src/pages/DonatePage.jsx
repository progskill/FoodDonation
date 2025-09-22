import React from "react";
import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import LocationPicker from "../components/common/LocationPicker";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import CashDonation from "../components/donation/CashDonation";

const DonatePage = () => {
  const { currentUser, isGuest } = useAuth();
  const { showSuccess, showError, notifyNewDonation } = useNotification();

  const [donationType, setDonationType] = useState("food");
  const [formData, setFormData] = useState({
    foodItem: "",
    quantity: "",
    expirationDate: "",
    description: "",
    location: "",
    contactInfo: "",
    coordinates: null,
    useManualLocation: false,
    pickupPreference: "flexible",
    availableUntil: "",
    targetRequestId: "",
    targetRequestType: "",
  });
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Load requests for the dropdown
  useEffect(() => {
    const regularRequestsQuery = query(collection(db, "requests"));

    const customRequestsQuery = query(collection(db, "food-requests"));

    const unsubscribeRegular = onSnapshot(regularRequestsQuery, (snapshot) => {
      const regularRequests = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === "open") {
          regularRequests.push({
            id: doc.id,
            ...data,
            type: "regular",
          });
        }
      });

      const unsubscribeCustom = onSnapshot(customRequestsQuery, (snapshot) => {
        const customRequests = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === "open") {
            customRequests.push({
              id: doc.id,
              ...data,
              type: "custom",
            });
          }
        });

        const allRequests = [...regularRequests, ...customRequests];

        // Sort by urgency first, then by creation date
        allRequests.sort((a, b) => {
          const urgencyOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          const aUrgency = urgencyOrder[a.urgency] || 1;
          const bUrgency = urgencyOrder[b.urgency] || 1;

          if (aUrgency !== bUrgency) {
            return bUrgency - aUrgency;
          }

          const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return bDate - aDate;
        });

        setRequests(allRequests);
      });

      return () => unsubscribeCustom();
    });

    return () => unsubscribeRegular();
  }, []);

  useEffect(() => {
    const donateToRequestData = sessionStorage.getItem("donateToRequest");
    if (donateToRequestData) {
      try {
        const requestInfo = JSON.parse(donateToRequestData);
        setFormData((prev) => ({
          ...prev,
          foodItem: requestInfo.suggestedFoodItem || "",
          quantity: requestInfo.suggestedQuantity || "",
          targetRequestId: requestInfo.targetRequestId || "",
          targetRequestType: requestInfo.targetRequestType || "",
        }));

        // Find and set the selected request
        const targetRequest = requests.find(
          (r) =>
            r.id === requestInfo.targetRequestId &&
            r.type === requestInfo.targetRequestType
        );
        if (targetRequest) {
          setSelectedRequest(targetRequest);
        }

        // Clear the session storage
        sessionStorage.removeItem("donateToRequest");
      } catch (error) {
        console.error("Error parsing donate request data:", error);
      }
    }
  }, [requests]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocationSelect = (location, coordinates) => {
    setFormData((prev) => ({
      ...prev,
      location,
      coordinates,
    }));
  };

  const handleRequestSelection = (e) => {
    const selectedValue = e.target.value;
    if (selectedValue === "") {
      setSelectedRequest(null);
      setFormData((prev) => ({
        ...prev,
        targetRequestId: "",
        targetRequestType: "",
      }));
      return;
    }

    const [requestType, requestId] = selectedValue.split("|");
    const request = requests.find(
      (r) => r.id === requestId && r.type === requestType
    );

    if (request) {
      setSelectedRequest(request);
      setFormData((prev) => ({
        ...prev,
        targetRequestId: requestId,
        targetRequestType: requestType,
        foodItem:
          request.foodItem ||
          request.foodType?.replace("-", " ") ||
          prev.foodItem,
        quantity: request.quantity || prev.quantity,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const donationData = {
        ...formData,
        donorId: currentUser?.uid || "guest",
        donorName: currentUser?.email || "Anonymous Donor",
        isGuest: isGuest || !currentUser,
        status: "available",
        createdAt: serverTimestamp(),
        claimedBy: null,
        claimedAt: null,
        remainingQuantity: formData.quantity,
        originalQuantity: formData.quantity,
        applicants: [],
        pickupPreference: formData.pickupPreference,
        availableUntil: formData.availableUntil || null,
      };

      const docRef = await addDoc(collection(db, "donations"), donationData);

      // If this donation is targeting a specific request, mark the request as fulfilled
      if (formData.targetRequestId && formData.targetRequestType) {
        try {
          const requestCollection =
            formData.targetRequestType === "regular"
              ? "requests"
              : "food-requests";
          await updateDoc(
            doc(db, requestCollection, formData.targetRequestId),
            {
              status: "fulfilled",
              fulfilledBy: currentUser?.uid || "guest",
              fulfilledAt: serverTimestamp(),
              donationId: docRef.id,
              donorContact: formData.contactInfo,
            }
          );
          showSuccess(
            "Your donation has been posted and the request has been marked as fulfilled!"
          );
        } catch (error) {
          console.error("Error updating request status:", error);
          showSuccess("Your donation has been posted successfully!");
        }
      } else {
        showSuccess("Your donation has been posted successfully!");
      }

      notifyNewDonation({ ...donationData, id: docRef.id });

      setFormData({
        foodItem: "",
        quantity: "",
        expirationDate: "",
        description: "",
        location: "",
        contactInfo: "",
        coordinates: null,
        useManualLocation: false,
        pickupPreference: "flexible",
        availableUntil: "",
        targetRequestId: "",
        targetRequestType: "",
      });
      setSelectedRequest(null);
      setCurrentStep(1);
      setShowPreview(false);
    } catch (error) {
      console.error("Error adding donation:", error);
      showError("Failed to post donation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute message="You need to create an account to share food donations with the community. This helps us maintain security and track donations properly.">
      <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-4">
              {donationType === "food"
                ? "🍎 Donate Food to Your Community"
                : "💰 Make a Cash Donation"}
            </h1>
            <p className="text-gray-600 text-lg mb-4">
              {donationType === "food"
                ? "Turn your extra food into hope for someone in need"
                : "Your financial contribution helps us serve the community better"}
            </p>

            {/* Donation Type Selection */}
            <div className="mb-6">
              <div className="inline-flex bg-white/70 backdrop-blur-sm rounded-2xl p-2 border-2 border-gray-200 shadow-lg">
                <button
                  onClick={() => setDonationType("food")}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                    donationType === "food"
                      ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  🍎 Donate Food
                </button>
                <button
                  onClick={() => setDonationType("cash")}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                    donationType === "cash"
                      ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  💰 Donate Cash
                </button>
              </div>
            </div>

            {/* Browse Requests Link - Only show for food donations */}
            {donationType === "food" && (
              <div className="mb-8">
                <a
                  href="/requests"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  🙋‍♀️ Browse Food Requests
                  <span className="ml-2 text-sm opacity-90">
                    → See what people need
                  </span>
                </a>
              </div>
            )}

            {/* Progress Steps - Only show for food donations */}
            {donationType === "food" && (
              <>
                <div className="flex justify-center items-center space-x-4 mb-8">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                          currentStep >= step
                            ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {currentStep > step ? "✓" : step}
                      </div>
                      {step < 3 && (
                        <div
                          className={`w-12 h-1 mx-2 transition-all ${
                            currentStep > step
                              ? "bg-gradient-to-r from-green-500 to-blue-500"
                              : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-sm text-gray-600">
                  {currentStep === 1 && "📝 Food Details"}
                  {currentStep === 2 && "📍 Location & Contact"}
                  {currentStep === 3 && "✨ Review & Submit"}
                </div>
              </>
            )}
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            {donationType === "cash" ? (
              <CashDonation />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Step 1: Food Details */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                      <span className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">
                        1
                      </span>
                      Tell us about your food
                    </h2>

                    {/* Request Selection Dropdown */}
                    <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border-2 border-blue-200">
                      <label className="block text-sm font-semibold text-blue-800 mb-3">
                        🎯 Are you donating to fulfill a specific request?
                        (Optional)
                      </label>
                      <select
                        value={
                          selectedRequest
                            ? `${selectedRequest.type}|${selectedRequest.id}`
                            : ""
                        }
                        onChange={handleRequestSelection}
                        className="w-full p-4 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
                      >
                        <option value="">
                          🆓 General donation (not for a specific request)
                        </option>
                        {requests.length > 0 && (
                          <optgroup label="🙋‍♀️ Open Food Requests">
                            {requests.map((request) => (
                              <option
                                key={`${request.type}-${request.id}`}
                                value={`${request.type}|${request.id}`}
                              >
                                {request.urgency === "urgent"
                                  ? "🚨"
                                  : request.urgency === "high"
                                  ? "⚡"
                                  : "📝"}{" "}
                                {request.foodItem ||
                                  request.foodType?.replace("-", " ")}{" "}
                                - {request.quantity} (
                                {request.location || "No location"})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>

                      {selectedRequest && (
                        <div className="mt-4 p-4 bg-white/70 rounded-lg border border-blue-300">
                          <h4 className="font-bold text-blue-800 mb-2">
                            📋 Request Details:
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <strong className="text-blue-700">
                                Requested by:
                              </strong>
                              <p className="text-blue-600">
                                {selectedRequest.requesterName ||
                                  selectedRequest.applicantName ||
                                  "Anonymous"}
                              </p>
                            </div>
                            <div>
                              <strong className="text-blue-700">
                                Urgency:
                              </strong>
                              <span
                                className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                                  selectedRequest.urgency === "urgent"
                                    ? "bg-red-100 text-red-800"
                                    : selectedRequest.urgency === "high"
                                    ? "bg-orange-100 text-orange-800"
                                    : selectedRequest.urgency === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {selectedRequest.urgency || "normal"}
                              </span>
                            </div>
                            {selectedRequest.description && (
                              <div className="md:col-span-2">
                                <strong className="text-blue-700">
                                  Additional details:
                                </strong>
                                <p className="text-blue-600">
                                  {selectedRequest.description}
                                </p>
                              </div>
                            )}
                            {selectedRequest.dietary && (
                              <div className="md:col-span-2">
                                <strong className="text-blue-700">
                                  Dietary needs:
                                </strong>
                                <p className="text-blue-600">
                                  {selectedRequest.dietary}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-blue-600 mt-3">
                        💡 <strong>Tip:</strong> Donating to a specific request
                        helps ensure your food goes directly to someone who
                        needs exactly what you're offering!
                      </p>
                    </div>
                    {/* Food Item */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          🥗 What are you donating? *
                        </label>
                        <input
                          type="text"
                          name="foodItem"
                          value={formData.foodItem}
                          onChange={handleInputChange}
                          placeholder="e.g., Fresh vegetables, Cooked rice, Bread loaves"
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                          required
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          📊 How much? (servings/portions) *
                        </label>
                        <input
                          type="number"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleInputChange}
                          placeholder="e.g., 5, 10, 20"
                          min="1"
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* Expiration & Available Until */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          📅 Best before date
                        </label>
                        <input
                          type="date"
                          name="expirationDate"
                          value={formData.expirationDate}
                          onChange={handleInputChange}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          ⏰ Available until
                        </label>
                        <input
                          type="datetime-local"
                          name="availableUntil"
                          value={formData.availableUntil}
                          onChange={handleInputChange}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </div>
                    </div>

                    {/* Pickup Preference */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        🚗 Pickup preference
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {
                            value: "flexible",
                            label: "🕐 Flexible",
                            desc: "Anytime works",
                          },
                          {
                            value: "asap",
                            label: "⚡ ASAP",
                            desc: "Pick up soon",
                          },
                          {
                            value: "scheduled",
                            label: "📅 Scheduled",
                            desc: "Specific time",
                          },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-center ${
                              formData.pickupPreference === option.value
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="pickupPreference"
                              value={option.value}
                              checked={
                                formData.pickupPreference === option.value
                              }
                              onChange={handleInputChange}
                              className="sr-only"
                            />
                            <div className="font-semibold">{option.label}</div>
                            <div className="text-xs text-gray-600">
                              {option.desc}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        📝 Additional details
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="Tell people more about the food - ingredients, dietary info, preparation notes, etc."
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none"
                      />
                    </div>

                    {/* Step 1 Navigation */}
                    <div className="flex justify-end pt-6">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        disabled={!formData.foodItem || !formData.quantity}
                        className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Continue to Location 👉
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Location & Contact */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                      <span className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">
                        2
                      </span>
                      Where can people pick it up?
                    </h2>

                    {/* Location Type Selection */}
                    <div className="bg-gray-50 p-6 rounded-xl">
                      <label className="block text-sm font-semibold text-gray-700 mb-4">
                        📍 How would you like to provide pickup location?
                      </label>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <label
                          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                            !formData.useManualLocation
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          <input
                            type="radio"
                            name="useManualLocation"
                            checked={!formData.useManualLocation}
                            onChange={() =>
                              setFormData((prev) => ({
                                ...prev,
                                useManualLocation: false,
                              }))
                            }
                            className="sr-only"
                          />
                          <div className="text-center">
                            <div className="text-2xl mb-2">🗺️</div>
                            <div className="font-semibold">Use Map/GPS</div>
                            <div className="text-sm text-gray-600">
                              Interactive location picker
                            </div>
                          </div>
                        </label>

                        <label
                          className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                            formData.useManualLocation
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          <input
                            type="radio"
                            name="useManualLocation"
                            checked={formData.useManualLocation}
                            onChange={() =>
                              setFormData((prev) => ({
                                ...prev,
                                useManualLocation: true,
                              }))
                            }
                            className="sr-only"
                          />
                          <div className="text-center">
                            <div className="text-2xl mb-2">✍️</div>
                            <div className="font-semibold">Type Address</div>
                            <div className="text-sm text-gray-600">
                              Manual entry
                            </div>
                          </div>
                        </label>
                      </div>

                      {/* Location Input */}
                      {formData.useManualLocation ? (
                        <div>
                          <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            placeholder="Enter pickup address (e.g., 123 Main St, or just 'Downtown Mall entrance')"
                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                            required
                          />
                          <p className="text-xs text-gray-600 mt-2">
                            💡 You can be as specific or general as you like -
                            just make it easy for people to find you!
                          </p>
                        </div>
                      ) : (
                        <div>
                          <LocationPicker
                            onLocationSelect={handleLocationSelect}
                            initialLocation={formData.location}
                          />
                        </div>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        📞 How can people reach you?
                      </label>
                      <input
                        type="text"
                        name="contactInfo"
                        value={formData.contactInfo}
                        onChange={handleInputChange}
                        placeholder="Phone number, WhatsApp, email, or preferred contact method"
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                        required
                      />
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          🔒 <strong>Privacy:</strong> Your contact info will
                          only be shared with people who apply for your donation
                        </p>
                      </div>
                    </div>

                    {/* Step 2 Navigation */}
                    <div className="flex justify-between pt-6">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-all"
                      >
                        👈 Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        disabled={!formData.location || !formData.contactInfo}
                        className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Review & Post 👉
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Review & Submit */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                      <span className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">
                        3
                      </span>
                      Review your donation
                    </h2>

                    {/* Preview Card */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border-2 border-green-200">
                      <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">👀</span> Preview how others will
                        see your donation:
                      </h3>

                      <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-semibold text-gray-800">
                              {formData.foodItem || "Your Food Item"}
                            </h4>
                            <p className="text-gray-600">
                              📍 {formData.location || "Your Location"}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            ✅ Available
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <span className="mr-2">🥄</span>
                            <span>
                              Quantity: {formData.quantity || "X"} servings
                            </span>
                          </div>
                          {formData.expirationDate && (
                            <div className="flex items-center">
                              <span className="mr-2">📅</span>
                              <span>
                                Best before:{" "}
                                {new Date(
                                  formData.expirationDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <span className="mr-2">👤</span>
                            <span>
                              By: {currentUser?.email || "Anonymous Donor"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-2">🚗</span>
                            <span>
                              Pickup:{" "}
                              {formData.pickupPreference === "flexible"
                                ? "Flexible timing"
                                : formData.pickupPreference === "asap"
                                ? "ASAP"
                                : "Scheduled pickup"}
                            </span>
                          </div>
                        </div>

                        {formData.description && (
                          <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                            {formData.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Terms & Guidelines */}
                    <div className="bg-yellow-50 p-6 rounded-xl border-2 border-yellow-200">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">📋</span> Community Guidelines
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <span className="text-green-600 mr-2 mt-0.5">
                              ✅
                            </span>
                            <span>Ensure food is safe and fresh</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-green-600 mr-2 mt-0.5">
                              ✅
                            </span>
                            <span>Be available for pickup coordination</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <span className="text-green-600 mr-2 mt-0.5">
                              ✅
                            </span>
                            <span>Respond to applications within 24 hours</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-green-600 mr-2 mt-0.5">
                              ✅
                            </span>
                            <span>Update status when no longer available</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-white rounded-lg">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            required
                            className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <span>
                            I agree to follow these community guidelines and
                            understand my responsibilities as a food donor.
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Step 3 Navigation */}
                    <div className="flex justify-between pt-6">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-all"
                      >
                        👈 Back
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="px-12 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                      >
                        {loading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            Posting your donation...
                          </div>
                        ) : (
                          <span>🎁 Share with Community</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* Guest Notice */}
            {(isGuest || !currentUser) && (
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">💡</div>
                  <div>
                    <h3 className="font-bold text-blue-900 mb-2">
                      Want to do more good?
                    </h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Create an account to manage your donations, track
                      applications, get real-time notifications, and see the
                      impact you're making in your community!
                    </p>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all">
                      🚀 Create Free Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default DonatePage;
