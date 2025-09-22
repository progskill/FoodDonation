import React from "react";
import "intasend-inlinejs-sdk";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useEffect, useState } from "react";

const CashDonation = () => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const INTASEND_API_KEY = import.meta.env.VITE_INTASEND_PUBLIC_KEY;

  const [amount, setAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");

  // Predefined amounts for quick selection
  const predefinedAmounts = [500, 1000, 2500, 5000, 10000];

  // Initialize donor info from current user
  useEffect(() => {
    if (currentUser) {
      setDonorEmail(currentUser.email || "");
      setDonorName(currentUser.displayName || "");
    }
  }, [currentUser]);

  const handleAmountSelect = (selectedAmount) => {
    setAmount(selectedAmount);
  };

  new window.IntaSend({
    publicAPIKey: INTASEND_API_KEY,
    live: true,
  })
    .on("COMPLETE", (response) => {
      console.log("COMPLETE:", response);
      handlePaymentSuccess(response);
    })
    .on("FAILED", (response) => {
      console.log("FAILED", response);
      showError("Payment failed. Please try again.");
    })
    .on("IN-PROGRESS", () => {
      console.log("INPROGRESS ...");
      showSuccess("💳 Payment is being processed...");
    });

  const handlePaymentSuccess = async () => {
    try {
      if (currentUser) {
        await addDoc(collection(db, "cash-donations"), {
          type: "cash",
          amount: parseFloat(amount),
          donorId: currentUser.uid,
          donorEmail: donorEmail || currentUser.email,
          donorName: donorName || currentUser.displayName || "Anonymous",
          status: "completed",
          createdAt: serverTimestamp(),
          paymentMethod: "intasend",
          reference: `Donation-${Date.now()}`,
        });
        showSuccess(
          "✅ Payment completed successfully! Thank you for your generous donation."
        );
      } else {
        // Handle guest donations
        await addDoc(collection(db, "cash-donations"), {
          type: "cash",
          amount: parseFloat(amount),
          donorEmail: donorEmail,
          donorName: donorName || "Anonymous",
          isGuest: true,
          status: "completed",
          createdAt: serverTimestamp(),
          paymentMethod: "intasend",
          reference: `Donation-${Date.now()}`,
        });
        showSuccess(
          "✅ Payment completed successfully! Thank you for your generous donation."
        );
      }
    } catch (error) {
      console.error("Error handling payment success:", error);
      showError("Payment completed but there was an error saving the record.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading payment system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mb-6 shadow-lg">
            <span className="text-3xl text-white">💝</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Make a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
              Difference
            </span>{" "}
            Today
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Your generous donation helps provide food and support to families in
            need within our community.
          </p>
        </div>

        {/* Main Donation Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 px-8 py-6">
            <h2 className="text-2xl font-bold text-white text-center">
              Cash Donation
            </h2>
            <p className="text-green-100 text-center mt-2">
              Choose your contribution amount
            </p>
          </div>

          <div className="p-8">
            {/* Donor Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-3">👤</span>
                Donor Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Donation Amount Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-3">💰</span>
                Donation Amount
              </h3>

              {/* Predefined Amounts */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                {predefinedAmounts.map((preAmount) => (
                  <button
                    key={preAmount}
                    onClick={() => handleAmountSelect(preAmount)}
                    className={`p-4 rounded-xl border-2 transition-all text-center font-semibold transform hover:scale-105 ${
                      amount === preAmount
                        ? "border-green-500 bg-gradient-to-r from-green-50 to-blue-50 text-green-700 shadow-lg ring-2 ring-green-200"
                        : "border-gray-200 hover:border-green-300 text-gray-700 hover:shadow-md"
                    }`}
                  >
                    <div className="text-sm text-gray-500 mb-1">KSH</div>
                    <div className="text-lg font-bold">
                      {preAmount.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                    KSH
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="Enter custom amount"
                    min="10"
                    className="w-full pl-16 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-colors text-lg font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Amount Display */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 mb-8 border border-green-100">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Your Donation</p>
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                  KSH {amount ? amount.toLocaleString() : "0"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This will help feed approximately{" "}
                  {Math.floor((amount || 0) / 50)} people
                </p>
              </div>
            </div>

            {/* Impact Statement */}
            <div className="bg-blue-50 rounded-2xl p-6 mb-8 border border-blue-100">
              <div className="flex items-start">
                <span className="text-2xl mr-4 mt-1">🌟</span>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Your Impact
                  </h4>
                  <p className="text-blue-700 text-sm leading-relaxed">
                    Every donation, no matter the size, makes a real difference
                    in someone's life. Your contribution helps us provide
                    nutritious meals, emergency food assistance, and support to
                    families facing food insecurity in our community.
                  </p>
                </div>
              </div>
            </div>

            {/* Donate Button */}
            <div className="text-center">
              <div className="inline-block">
                <button
                  className="intaSendPayButton relative px-12 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-amount={amount}
                  data-currency="KES"
                  data-reference={`Donation-${Date.now()}`}
                  disabled={!amount || amount < 10 || !donorEmail}
                >
                  <span className="flex items-center justify-center">
                    <span className="text-2xl mr-3">🚀</span>
                    Donate KSH {amount ? amount.toLocaleString() : "0"} Now
                  </span>
                </button>
                {(!amount || amount < 10 || !donorEmail) && (
                  <p className="text-red-500 text-sm mt-2">
                    {!donorEmail
                      ? "Please enter your email address"
                      : !amount || amount < 10
                      ? "Minimum donation is KSH 10"
                      : ""}
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
                <span className="mr-2">🔒</span>
                Secure payment powered by IntaSend
              </div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="text-3xl mb-4">🛡️</div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Secure Payments
            </h4>
            <p className="text-gray-600 text-sm">
              Your donation is processed securely with bank-level encryption
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="text-3xl mb-4">📊</div>
            <h4 className="font-semibold text-gray-800 mb-2">
              100% Transparent
            </h4>
            <p className="text-gray-600 text-sm">
              Track how your donation is making an impact in the community
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="text-3xl mb-4">🤝</div>
            <h4 className="font-semibold text-gray-800 mb-2">Direct Impact</h4>
            <p className="text-gray-600 text-sm">
              Your donation goes directly to families in need
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashDonation;
