import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useNotification } from "../contexts/NotificationContext";

const DonationSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [donation, setDonation] = useState(null);

  useEffect(() => {
    const handlePaymentReturn = async () => {
      const ref = searchParams.get('ref');
      const status = searchParams.get('status'); // IntaSend passes this

      if (!ref) {
        showError("Invalid payment reference");
        navigate('/donate');
        return;
      }

      try {
        // Get the donation record
        const donationDoc = await getDoc(doc(db, "cash-donations", ref));

        if (!donationDoc.exists()) {
          showError("Donation record not found");
          navigate('/donate');
          return;
        }

        const donationData = donationDoc.data();
        setDonation({ id: ref, ...donationData });

        // Update donation status based on payment result
        if (status === 'successful' || status === 'completed') {
          await updateDoc(doc(db, "cash-donations", ref), {
            status: 'completed',
            completedAt: serverTimestamp(),
            paymentReference: searchParams.get('transaction_id') || `INTASEND_${Date.now()}`,
            paymentMethod: searchParams.get('payment_method') || 'unknown'
          });

          showSuccess("🎉 Payment completed successfully! Thank you for your generous donation.");

          // Clear any pending donation from localStorage
          localStorage.removeItem('pendingDonation');

        } else if (status === 'failed' || status === 'cancelled') {
          await updateDoc(doc(db, "cash-donations", ref), {
            status: 'failed',
            failedAt: serverTimestamp(),
            failureReason: status === 'cancelled' ? 'Payment cancelled by user' : 'Payment failed'
          });

          showError("❌ Payment was not completed. You can try again from the donation page.");
        } else {
          // For pending or unknown status, keep as is
          console.log("Payment status:", status);
        }

      } catch (error) {
        console.error("Error processing payment return:", error);
        showError("Error processing payment result");
      } finally {
        setLoading(false);
      }
    };

    handlePaymentReturn();
  }, [searchParams, navigate, showSuccess, showError]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Processing payment result...</h2>
        </div>
      </div>
    );
  }

  const isSuccess = donation?.status === 'completed';

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">

          {isSuccess ? (
            <>
              {/* Success State */}
              <div className="text-6xl mb-6">🎉</div>
              <h1 className="text-3xl font-bold text-green-600 mb-4">
                Donation Successful!
              </h1>
              <p className="text-gray-700 text-lg mb-6">
                Thank you for your generous contribution to our community food bank.
                Your donation will make a real difference in the lives of those in need.
              </p>

              {/* Donation Details */}
              {donation && (
                <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200 mb-6">
                  <h3 className="font-bold text-green-800 mb-4">Donation Details</h3>
                  <div className="space-y-2 text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-semibold">KSH {donation.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Purpose:</span>
                      <span className="font-semibold">
                        {donation.purpose === 'general' ? 'General Support' :
                         donation.purpose === 'food-purchase' ? 'Food Purchase' : 'Operations'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Donor:</span>
                      <span className="font-semibold">{donation.donorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reference:</span>
                      <span className="font-semibold font-mono text-xs">{donation.id.slice(-8).toUpperCase()}</span>
                    </div>
                  </div>

                  {donation.message && (
                    <div className="mt-4 p-3 bg-white rounded text-sm text-gray-700">
                      <strong>Your message:</strong> "{donation.message}"
                    </div>
                  )}
                </div>
              )}

              {/* Impact Message */}
              <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200 mb-6">
                <h3 className="font-bold text-blue-800 mb-2">Your Impact</h3>
                <p className="text-sm text-blue-700">
                  Your donation can help provide meals for families in need, support our food distribution programs,
                  and ensure our community food bank continues to serve those who need it most.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Failed State */}
              <div className="text-6xl mb-6">😞</div>
              <h1 className="text-3xl font-bold text-red-600 mb-4">
                Payment Not Completed
              </h1>
              <p className="text-gray-700 text-lg mb-6">
                Your payment was not completed. This could be due to cancellation,
                insufficient funds, or a technical issue.
              </p>

              <div className="bg-red-50 p-6 rounded-xl border-2 border-red-200 mb-6">
                <h3 className="font-bold text-red-800 mb-2">What happened?</h3>
                <p className="text-sm text-red-700">
                  {donation?.failureReason || "The payment process was interrupted or cancelled."}
                </p>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/donate')}
              className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                isSuccess
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSuccess ? '🎁 Make Another Donation' : '🔄 Try Again'}
            </button>

            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-all"
            >
              🏠 Go to Homepage
            </button>
          </div>

          {/* Support Contact */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Need help? Contact our support team at{" "}
              <a href="mailto:support@foodbank.org" className="text-blue-600 hover:underline">
                support@foodbank.org
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationSuccessPage;