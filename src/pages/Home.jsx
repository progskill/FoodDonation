import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Footer from "../components/layout/Footer";

const Home = () => {
  const { currentUser, isGuest } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-green-400 rounded-full blur-xl"></div>
        <div className="absolute top-1/3 right-20 w-48 h-48 bg-blue-400 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-orange-400 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-28 h-28 bg-purple-400 rounded-full blur-lg"></div>
      </div>

      <div className="relative z-10">
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
              Community Food Bank
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Connecting food donors with people in need. Share meals, build
              community, and help fight hunger in your neighborhood.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/donate"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 inline-block"
              >
                🍎 Donate Food
              </Link>
              <Link
                to="/receive"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 inline-block"
              >
                🤝 Request Food
              </Link>
              <Link
                to="/donations"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 inline-block"
              >
                📋 View Available
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="card text-center">
                <div className="text-4xl mb-4">🍽️</div>
                <h3 className="text-xl font-semibold mb-4">Donate Food</h3>
                <p className="text-gray-600">
                  Have extra food? Share it with others! Post available items
                  with pickup location and details.
                </p>
              </div>

              <div className="card text-center">
                <div className="text-4xl mb-4">📍</div>
                <h3 className="text-xl font-semibold mb-4">Find on Map</h3>
                <p className="text-gray-600">
                  Use Google Maps integration to find donations near you and get
                  directions to pickup locations.
                </p>
              </div>

              <div className="card text-center">
                <div className="text-4xl mb-4">🔔</div>
                <h3 className="text-xl font-semibold mb-4">Get Notified</h3>
                <p className="text-gray-600">
                  Receive instant notifications when new food donations become
                  available in your area.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-primary-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">
              Making a Difference Together
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold">500+</div>
                <div className="text-primary-100">Meals Shared</div>
              </div>
              <div>
                <div className="text-3xl font-bold">150+</div>
                <div className="text-primary-100">Active Donors</div>
              </div>
              <div>
                <div className="text-3xl font-bold">300+</div>
                <div className="text-primary-100">Families Helped</div>
              </div>
              <div>
                <div className="text-3xl font-bold">12</div>
                <div className="text-primary-100">Neighborhoods</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join our community today and help make a difference in someone's
              life.
            </p>

            {!currentUser || isGuest ? (
              <div className="space-y-4">
                <p className="text-lg text-gray-600">
                  Sign up for a free account to save your preferences and get
                  personalized notifications.
                </p>
                <button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
                  Create Free Account
                </button>
                <p className="text-sm text-gray-500">
                  Or continue using all features as a guest
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-lg text-success-600 font-medium">
                  Welcome back! Ready to make a difference today?
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/donate"
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 inline-block"
                  >
                    Share Food Now
                  </Link>
                  <Link
                    to="/donations"
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 inline-block"
                  >
                    Browse Donations
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Home;
