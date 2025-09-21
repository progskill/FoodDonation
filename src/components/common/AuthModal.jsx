import React from "react";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";

const AuthModal = ({ onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { signUp, login } = useAuth();
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password);
        showSuccess("Account created successfully!");
      } else {
        await login(email, password);
        showSuccess("Signed in successfully!");
      }
      onClose();
    } catch (error) {
      setError(error.message);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl max-w-md w-full p-8 shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl mb-4">
            <span className="text-2xl">
              {isSignUp ? "🚀" : "👋"}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
            {isSignUp ? "Join Our Community" : "Welcome Back"}
          </h2>
          <p className="text-gray-600">
            {isSignUp ? "Create your account to start sharing food and building community connections" : "Sign in to continue your food sharing journey"}
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all shadow-lg"
          >
            ×
          </button>
        </div>


        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl shadow-sm">
            <div className="flex items-center space-x-2">
              <span className="text-red-500">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700 mb-3"
            >
              📧 Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white/80 backdrop-blur-sm"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700 mb-3"
            >
              🔒 Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white/80 backdrop-blur-sm"
              placeholder={isSignUp ? "Create a secure password (min 6 characters)" : "Enter your password"}
              required
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-gray-700 mb-3"
              >
                🔒 Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white/80 backdrop-blur-sm"
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Please wait...</span>
              </div>
            ) : (
              <span>
                {isSignUp ? "🚀 Create My Account" : "👋 Sign Me In"}
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/90 text-gray-500">or</span>
            </div>
          </div>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-4 px-6 py-3 bg-white/80 hover:bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 rounded-2xl font-semibold transition-all shadow-sm hover:shadow-md"
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Need an account? Sign Up"}
          </button>
        </div>

        {/* Benefits Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
          <h3 className="font-bold text-blue-800 mb-3 text-center">
            🌟 Join Our Community Benefits
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-blue-500">✅</span>
              <span className="text-blue-700">Safe & Secure</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-500">✅</span>
              <span className="text-blue-700">Track Donations</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-500">✅</span>
              <span className="text-blue-700">Get Notifications</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-500">✅</span>
              <span className="text-blue-700">Build Community</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
