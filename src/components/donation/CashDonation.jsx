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

  // Predefined amounts for quick selection
  const predefinedAmounts = [500, 1000, 2500, 5000, 10000];

  const handleAmountSelect = (selectedAmount) => {
    setAmount(selectedAmount);
  };

  new window.IntaSend({
    publicAPIKey: INTASEND_API_KEY,
    live: false,
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
          donorEmail: currentUser.email,
          status: "completed",
          createdAt: serverTimestamp(),
          paymentMethod: "intasend",
        });
        showSuccess(
          "✅ Payment completed successfully! Thank you for your donation."
        );
      }
    } catch (error) {
      console.error("Error handling payment success:", error);
      showError("Payment completed but there was an error saving the record.");
    }
  };

  if (loading) {
    return <p>Loading payment system...</p>;
  }

  return (
    <div className="rounded">
      <div className="border border-green-500 w-[300px] mb-12 rounded-md p-4">
        <h1 className="text-xl font-bold my-3">Choose Donation Amount</h1>

        {/* Predefined Amounts */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {predefinedAmounts.map((preAmount) => (
            <button
              key={preAmount}
              onClick={() => handleAmountSelect(preAmount)}
              className={`p-2 rounded border-2 transition-all text-center font-semibold ${
                amount === preAmount
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-700"
              }`}
            >
              KSH {preAmount.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Custom Amount Input */}
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="Enter custom amount"
          min="10"
          className="w-full p-2 border-2 border-green-500 rounded mb-4"
        />

        <p className="text-lg mb-4 text-green-600 font-bold">
          Amount:
          <span className="text-gray-800 ml-3">
            KSH {amount ? amount.toLocaleString() : "0"}
          </span>
        </p>
      </div>

      <div className="rounded-full font-semibold bg-gradient-to-r from-green-600 to-blue-600 hover:scale-110 hover:delay-150 ease-in-out duration-150">
        <button
          className="intaSendPayButton"
          data-amount={amount}
          data-currency="KES"
          data-reference={`Donation-${Date.now()}`}
        >
          Donate Now
        </button>
      </div>
    </div>
  );
};

export default CashDonation;
