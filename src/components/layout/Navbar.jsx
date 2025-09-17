import React from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AuthModal from "../common/AuthModal";

const Navbar = () => {
  const { currentUser, logout, isGuest } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const isActivePath = (path) => location.pathname === path;

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🍽️</span>
              </div>
              <span className="text-xl font-bold text-gray-800">
                Community Food Bank
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className={`hover:text-primary-600 transition-colors ${
                  isActivePath("/")
                    ? "text-primary-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                Home
              </Link>
              <Link
                to="/donations"
                className={`hover:text-primary-600 transition-colors ${
                  isActivePath("/donations")
                    ? "text-primary-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                View Donations
              </Link>
              <Link
                to="/donate"
                className={`hover:text-primary-600 transition-colors ${
                  isActivePath("/donate")
                    ? "text-primary-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                Donate Food
              </Link>
              <Link
                to="/receive"
                className={`hover:text-primary-600 transition-colors ${
                  isActivePath("/receive")
                    ? "text-primary-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                Request Food
              </Link>
              <Link
                to="/requests"
                className={`hover:text-primary-600 transition-colors ${
                  isActivePath("/requests")
                    ? "text-primary-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                Browse Requests
              </Link>
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {currentUser && !isGuest ? (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/profile"
                    className="text-gray-700 hover:text-primary-600"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary px-4 py-2"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="btn-primary px-4 py-2"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden flex items-center px-3 py-2 border rounded text-gray-500 border-gray-600 hover:text-gray-800 hover:border-gray-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    isMobileMenuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-2">
                <Link
                  to="/"
                  className="px-2 py-1 text-gray-700 hover:text-primary-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  to="/donations"
                  className="px-2 py-1 text-gray-700 hover:text-primary-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  View Donations
                </Link>
                <Link
                  to="/donate"
                  className="px-2 py-1 text-gray-700 hover:text-primary-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Donate Food
                </Link>
                <Link
                  to="/receive"
                  className="px-2 py-1 text-gray-700 hover:text-primary-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Request Food
                </Link>
                <Link
                  to="/requests"
                  className="px-2 py-1 text-gray-700 hover:text-primary-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Browse Requests
                </Link>

                <div className="pt-2 border-t border-gray-200">
                  {currentUser && !isGuest ? (
                    <>
                      <Link
                        to="/profile"
                        className="px-2 py-1 text-gray-700 hover:text-primary-600"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-2 py-1 text-gray-700 hover:text-primary-600"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowAuthModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-2 py-1 text-gray-700 hover:text-primary-600"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
};

export default Navbar;
