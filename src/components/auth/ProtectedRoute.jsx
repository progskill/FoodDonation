import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from '../common/AuthModal';

const ProtectedRoute = ({ children, message }) => {
  const { currentUser, isGuest } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // If user is not authenticated or is a guest, show auth requirement
  if (!currentUser || isGuest) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl mb-6">
                <span className="text-4xl">🔐</span>
              </div>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
                Account Required
              </h1>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
                {message || "You need to create an account or sign in to access this feature. This helps us maintain security and provide personalized experiences for our community members."}
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 mb-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-4">
                    🎁
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                    For Donors
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Track your donations, manage applications, and see the impact you're making in your community.
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1 mb-6">
                    <li>• Manage donation listings</li>
                    <li>• Track pickup confirmations</li>
                    <li>• View community impact metrics</li>
                    <li>• Get notifications for applications</li>
                  </ul>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-4">
                    🏠
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                    For Recipients
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Register your household, apply for donations, and track your requests safely and securely.
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1 mb-6">
                    <li>• Apply for food donations</li>
                    <li>• Register household members</li>
                    <li>• Track application status</li>
                    <li>• Make specific food requests</li>
                  </ul>
                </div>
              </div>

              <div className="text-center mt-8">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  🚀 Create Account or Sign In
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-3xl p-6">
              <div className="flex items-center justify-center space-x-4">
                <div className="text-3xl">🛡️</div>
                <div>
                  <h3 className="font-bold text-yellow-800 mb-2">Why Authentication is Required</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• <strong>Security:</strong> Protects both donors and recipients from fraud</li>
                    <li>• <strong>Accountability:</strong> Ensures responsible food sharing</li>
                    <li>• <strong>Tracking:</strong> Allows proper coordination and follow-up</li>
                    <li>• <strong>Trust:</strong> Builds confidence in our community network</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </>
    );
  }

  // User is authenticated, render the protected content
  return children;
};

export default ProtectedRoute;