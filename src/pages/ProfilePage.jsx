import React from "react";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useHousehold } from "../hooks/useHousehold";
import HouseholdRegistration from "../components/common/HouseholdRegistration";

const ProfilePage = () => {
  const { currentUser, logout } = useAuth();
  const { showSuccess, showError } = useNotification();
  const {
    household,
    hasHousehold,
    getHouseholdSize,
    isLargeHousehold,
  } = useHousehold();
  const [profileView, setProfileView] = useState("overview"); // overview, donor, applicant
  const [activeTab, setActiveTab] = useState("overview");
  const [userDonations, setUserDonations] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [claimedDonations, setClaimedDonations] = useState([]);
  const [donationApplications, setDonationApplications] = useState([]);
  const [userApplications, setUserApplications] = useState([]);
  const [userType, setUserType] = useState(null);
  const [showHouseholdForm, setShowHouseholdForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState({
    donations: false,
    requests: false,
    claimed: false,
    applications: false
  });

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    console.log('ProfilePage: Starting data fetch for user:', currentUser.uid);
    setLoading(true);
    setDataLoaded({ donations: false, requests: false, claimed: false, applications: false });

    const fetchUserData = async () => {
      try {
        // Get user's donations
        const donationsQuery = query(
          collection(db, "donations"),
          where("donorId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );

        // Get user's requests
        const requestsQuery = query(
          collection(db, "requests"),
          where("requesterId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );

        // Get claimed donations
        const claimedQuery = query(
          collection(db, "donations"),
          where("claimedBy", "==", currentUser.uid),
          orderBy("claimedAt", "desc")
        );


        const unsubscribeDonations = onSnapshot(donationsQuery, (snapshot) => {
          const donations = [];
          snapshot.forEach((doc) => {
            donations.push({ id: doc.id, ...doc.data() });
          });
          console.log('ProfilePage: Loaded donations (as DONOR):', donations.length);
          if (donations.length > 0) {
            console.log('ProfilePage: User IS a DONOR - sample donation:', donations[0]);
          }
          setUserDonations(donations);
          setDataLoaded(prev => ({ ...prev, donations: true }));
        }, (error) => {
          console.error('Error fetching donations:', error);
          setDataLoaded(prev => ({ ...prev, donations: true }));
        });

        const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
          const requests = [];
          snapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() });
          });
          console.log('ProfilePage: Loaded requests (as APPLICANT):', requests.length);
          if (requests.length > 0) {
            console.log('ProfilePage: User HAS made requests - sample request:', requests[0]);
          }
          setUserRequests(requests);
          setDataLoaded(prev => ({ ...prev, requests: true }));
        }, (error) => {
          console.error('Error fetching requests:', error);
          setDataLoaded(prev => ({ ...prev, requests: true }));
        });

        const unsubscribeClaimed = onSnapshot(claimedQuery, (snapshot) => {
          const claimed = [];
          snapshot.forEach((doc) => {
            claimed.push({ id: doc.id, ...doc.data() });
          });
          console.log('ProfilePage: Loaded claimed donations (as APPLICANT):', claimed.length);
          if (claimed.length > 0) {
            console.log('ProfilePage: User HAS claimed donations - sample claim:', claimed[0]);
          }
          setClaimedDonations(claimed);
          setDataLoaded(prev => ({ ...prev, claimed: true }));
        }, (error) => {
          console.error('Error fetching claimed donations:', error);
          setDataLoaded(prev => ({ ...prev, claimed: true }));
        });

        // Get applications to user's donations for impact metrics
        const applicationsQuery = query(
          collection(db, "donations"),
          where("donorId", "==", currentUser.uid)
        );
        
        // ADDITIONAL CHECK: Get user's applications from applications collection
        const userApplicationsQuery = query(
          collection(db, "applications"),
          where("applicantId", "==", currentUser.uid)
        );

        const unsubscribeApplications = onSnapshot(
          applicationsQuery,
          async (snapshot) => {
            try {
              const donationIds = [];
              snapshot.forEach((doc) => {
                donationIds.push(doc.id);
              });

              if (donationIds.length > 0) {
                // Count total applications to user's donations
                const allApplications = [];
                const appQuery = query(
                  collection(db, "donations"),
                  where("claimedBy", "!=", null)
                );
                const appSnapshot = await getDocs(appQuery);
                appSnapshot.forEach((doc) => {
                  const data = doc.data();
                  if (data.donorId === currentUser.uid) {
                    allApplications.push({ id: doc.id, ...data });
                  }
                });
                console.log('ProfilePage: Loaded donation applications:', allApplications.length);
                setDonationApplications(allApplications);
                currentApplications = allApplications;
              }
              setDataLoaded(prev => ({ ...prev, applications: true }));
            } catch (error) {
              console.error('Error fetching donation applications:', error);
              setDataLoaded(prev => ({ ...prev, applications: true }));
            }
          }
        );

        // Monitor user's applications for complete applicant picture
        const unsubscribeUserApplications = onSnapshot(userApplicationsQuery, (snapshot) => {
          const applications = [];
          snapshot.forEach((doc) => {
            applications.push({ id: doc.id, ...doc.data() });
          });
          console.log('ProfilePage: Loaded user applications from applications collection:', applications.length);
          if (applications.length > 0) {
            console.log('ProfilePage: ADDITIONAL APPLICANT EVIDENCE - Applications:', applications.map(a => ({ id: a.id, donationTitle: a.donationTitle, applicantId: a.applicantId })));
          }
          setUserApplications(applications);
        }, (error) => {
          console.error('Error fetching user applications:', error);
          setUserApplications([]);
        });

        return () => {
          unsubscribeDonations();
          unsubscribeRequests();
          unsubscribeClaimed();
          unsubscribeApplications();
          unsubscribeUserApplications();
        };
      } catch (error) {
        console.error('Error setting up data subscriptions:', error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  // REINFORCED user type determination with comprehensive logging
  useEffect(() => {
    const allDataLoaded = Object.values(dataLoaded).every(loaded => loaded);
    
    if (allDataLoaded && currentUser) {
      console.log('======= ProfilePage: DETERMINING USER TYPE =======');
      console.log('ProfilePage: User ID:', currentUser.uid);
      console.log('ProfilePage: Email:', currentUser.email);
      console.log('ProfilePage: Data loaded state:', dataLoaded);
      console.log('ProfilePage: Donations (as donor):', userDonations.length);
      console.log('ProfilePage: Requests (as applicant):', userRequests.length);
      console.log('ProfilePage: Claimed donations (as applicant):', claimedDonations.length);
      console.log('ProfilePage: Applications (as applicant):', userApplications.length);
      console.log('ProfilePage: Has household:', hasHousehold);
      
      if (userDonations.length > 0) {
        console.log('ProfilePage: DONOR EVIDENCE - User donations:', userDonations.map(d => ({ id: d.id, foodItem: d.foodItem, donorId: d.donorId })));
      }
      if (claimedDonations.length > 0) {
        console.log('ProfilePage: APPLICANT EVIDENCE - Claimed donations:', claimedDonations.map(d => ({ id: d.id, foodItem: d.foodItem, claimedBy: d.claimedBy })));
      }
      if (userRequests.length > 0) {
        console.log('ProfilePage: APPLICANT EVIDENCE - User requests:', userRequests.map(r => ({ id: r.id, foodType: r.foodType, requesterId: r.requesterId })));
      }
      if (userApplications.length > 0) {
        console.log('ProfilePage: APPLICANT EVIDENCE - User applications:', userApplications.map(a => ({ id: a.id, donationTitle: a.donationTitle, applicantId: a.applicantId })));
      }
      
      // REINFORCED LOGIC: Multiple ways to be a donor or applicant
      const isDonor = userDonations.length > 0;
      const isApplicantViaRequests = userRequests.length > 0;
      const isApplicantViaClaims = claimedDonations.length > 0;
      const isApplicantViaApplications = userApplications.length > 0;
      const isApplicantViaHousehold = hasHousehold;
      const isApplicant = isApplicantViaRequests || isApplicantViaClaims || isApplicantViaApplications || isApplicantViaHousehold;
      
      console.log('ProfilePage: isDonor:', isDonor, '(based on', userDonations.length, 'donations created)');
      console.log('ProfilePage: isApplicant:', isApplicant, '(breakdown below)');
      console.log('ProfilePage:   - via requests:', isApplicantViaRequests, '(', userRequests.length, 'requests)');
      console.log('ProfilePage:   - via claims:', isApplicantViaClaims, '(', claimedDonations.length, 'claims)');
      console.log('ProfilePage:   - via applications:', isApplicantViaApplications, '(', userApplications.length, 'applications)');
      console.log('ProfilePage:   - via household:', isApplicantViaHousehold, '(', hasHousehold, ')');

      let newUserType;
      let newProfileView = profileView;
      
      if (isDonor && isApplicant) {
        newUserType = "both";
        console.log('ProfilePage: ✅ USER IS BOTH DONOR AND APPLICANT');
        // Keep current view if valid, otherwise default to overview
        if (profileView !== "donor" && profileView !== "applicant") {
          newProfileView = "overview";
          console.log('ProfilePage: Setting view to overview for dual-role user');
        } else {
          console.log('ProfilePage: Keeping current view:', profileView);
        }
      } else if (isDonor) {
        newUserType = "donor";
        newProfileView = "donor";
        console.log('ProfilePage: ✅ USER IS DONOR ONLY');
      } else if (isApplicant) {
        newUserType = "applicant";
        newProfileView = "applicant";
        console.log('ProfilePage: ✅ USER IS APPLICANT ONLY');
      } else {
        newUserType = "new";
        newProfileView = "overview";
        console.log('ProfilePage: ✅ USER IS NEW (no activity)');
      }
      
      console.log('ProfilePage: FINAL DETERMINATION:');
      console.log('ProfilePage:   - userType:', newUserType);
      console.log('ProfilePage:   - profileView:', newProfileView);
      console.log('======= END USER TYPE DETERMINATION =======');
      
      setUserType(newUserType);
      if (newProfileView !== profileView) {
        console.log('ProfilePage: Changing view from', profileView, 'to', newProfileView);
        setProfileView(newProfileView);
      }
      setLoading(false);
    } else if (currentUser) {
      console.log('ProfilePage: Waiting for data to load. Status:', dataLoaded);
    }
  }, [dataLoaded, userDonations.length, userRequests.length, claimedDonations.length, userApplications.length, hasHousehold, currentUser]);

  // Helper function to get view-specific stats
  const getViewStats = () => {
    if (profileView === "donor" || (profileView === "overview" && userType === "donor")) {
      return {
        primary: { value: userDonations.length, label: "Donations Made", icon: "🎁", color: "green" },
        secondary: { value: donationApplications.length, label: "Households Helped", icon: "👨‍👩‍👧‍👦", color: "blue" },
        tertiary: { value: userDonations.filter(d => d.status === "completed").length, label: "Completed", icon: "✅", color: "purple" },
        quaternary: { value: userDonations.filter(d => d.claimedBy).length, label: "Items Claimed", icon: "🤝", color: "orange" }
      };
    } else if (profileView === "applicant" || (profileView === "overview" && userType === "applicant")) {
      return {
        primary: { value: claimedDonations.length, label: "Food Received", icon: "🍽️", color: "blue" },
        secondary: { value: userRequests.length, label: "Requests Made", icon: "📝", color: "orange" },
        tertiary: { value: hasHousehold ? getHouseholdSize() : 0, label: "Household Members", icon: "👥", color: "purple" },
        quaternary: { value: userRequests.filter(r => r.status === "fulfilled").length, label: "Fulfilled Requests", icon: "✅", color: "green" }
      };
    } else {
      // Overview for "both" users
      return {
        primary: { value: userDonations.length, label: "Donations Made", icon: "🎁", color: "green" },
        secondary: { value: claimedDonations.length, label: "Food Received", icon: "🍽️", color: "blue" },
        tertiary: { value: userRequests.length, label: "Requests Made", icon: "📝", color: "orange" },
        quaternary: { value: (userDonations.filter(d => d.status === "completed").length + claimedDonations.filter(c => c.status === "completed").length), label: "Total Completed", icon: "✅", color: "purple" }
      };
    }
  };

  const handleStatusUpdate = async (itemId, collection_name, newStatus) => {
    try {
      await updateDoc(doc(db, collection_name, itemId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      showSuccess(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      showError("Failed to update status");
    }
  };

  const handleDelete = async (itemId, collection_name) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteDoc(doc(db, collection_name, itemId));
      showSuccess("Item deleted successfully");
    } catch (error) {
      console.error("Error deleting item:", error);
      showError("Failed to delete item");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
      case "open":
        return "bg-success-100 text-success-800";
      case "claimed":
        return "bg-orange-100 text-orange-800";
      case "completed":
      case "fulfilled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Sign In Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in to view your profile
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const getProfileDescription = () => {
    if (profileView === "donor") {
      return "Track your donations and see your community impact";
    } else if (profileView === "applicant") {
      return "View your applications and manage household information";
    } else if (userType === "both") {
      return "Your complete community food sharing profile";
    } else if (userType === "new") {
      return "Welcome! Let's set up your profile to get started";
    }
    return "Manage your community food sharing activities";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Beautiful Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl mb-6">
            <span className="text-4xl">
              {profileView === "donor" ? "🎁" : profileView === "applicant" ? "🏠" : "👤"}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            My Profile
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {getProfileDescription()}
          </p>
        </div>

        {/* View Toggle Buttons for dual-role users */}
        {userType === "both" && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-white/20">
              <button
                onClick={() => setProfileView("overview")}
                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  profileView === "overview"
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105"
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setProfileView("donor")}
                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  profileView === "donor"
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105"
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                }`}
              >
                🎁 Donor View
              </button>
              <button
                onClick={() => setProfileView("applicant")}
                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  profileView === "applicant"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform scale-105"
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                }`}
              >
                🏠 Applicant View
              </button>
            </div>
          </div>
        )}

        {/* Beautiful Profile Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Profile Avatar & Info */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {(currentUser.displayName || currentUser.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {currentUser.displayName || currentUser.email.split('@')[0]}
                </h2>
                <p className="text-gray-600 mb-1">{currentUser.email}</p>
                <p className="text-sm text-gray-500">
                  Member since {formatDate(currentUser.metadata?.creationTime)}
                </p>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-4">
              {userType && (
                <div className={`px-6 py-3 rounded-2xl font-semibold shadow-lg ${
                  userType === "donor" ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white" :
                  userType === "applicant" ? "bg-gradient-to-r from-blue-400 to-cyan-500 text-white" :
                  userType === "both" ? "bg-gradient-to-r from-purple-400 to-pink-500 text-white" :
                  "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                }`}>
                  {userType === "donor" ? "🤝 Community Donor" :
                   userType === "applicant" ? "🏠 Food Applicant" :
                   userType === "both" ? "🌟 Donor & Applicant" :
                   "👋 New Member"}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                {!hasHousehold && (userType === "applicant" || userType === "both" || userType === "new") && (
                  <button
                    onClick={() => setShowHouseholdForm(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    📝 Register Household
                  </button>
                )}
                {hasHousehold && (
                  <button
                    onClick={() => setShowHouseholdForm(true)}
                    className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:border-gray-400 transition-all"
                  >
                    ✏️ Edit Household
                  </button>
                )}
                <button 
                  onClick={logout} 
                  className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:border-red-300 hover:text-red-600 transition-all"
                >
                  👋 Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Household Info */}
          {hasHousehold && (profileView === "applicant" || profileView === "overview") && (
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2 flex items-center">
                🏠 Household: {household?.householdName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-blue-700">
                  <span className="font-medium">{getHouseholdSize()}</span> members
                </div>
                <div className="text-blue-700">
                  <span className="font-medium">{isLargeHousehold() ? "Large" : "Standard"}</span> household
                </div>
                <div className="text-blue-700">
                  <span className="font-medium">{isLargeHousehold() ? "35%" : "30%"}</span> donation limit
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Beautiful Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {(() => {
            const stats = getViewStats();
            return Object.entries(stats).map(([key, stat]) => (
              <div key={key} className="group bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-2xl ${
                    stat.color === 'green' ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                    stat.color === 'blue' ? 'bg-gradient-to-br from-blue-400 to-cyan-500' :
                    stat.color === 'orange' ? 'bg-gradient-to-br from-orange-400 to-yellow-500' :
                    stat.color === 'purple' ? 'bg-gradient-to-br from-purple-400 to-pink-500' :
                    'bg-gradient-to-br from-gray-400 to-gray-500'
                  } text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-gray-800 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Get Started Card for New Users */}
        {userType === "new" && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-3xl p-8 mb-12 text-center">
            <div className="text-6xl mb-6">🚀</div>
            <h3 className="text-2xl font-bold text-indigo-800 mb-4">
              Welcome to the Community Food Network!
            </h3>
            <p className="text-indigo-700 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of community members sharing food and reducing waste. 
              Get started by choosing how you'd like to help.
            </p>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                <div className="text-4xl mb-4">🎁</div>
                <h4 className="font-bold text-green-800 mb-2">Become a Donor</h4>
                <p className="text-gray-600 mb-4">Share your excess food with families in need</p>
                <a href="/donate" className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  Start Donating
                </a>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                <div className="text-4xl mb-4">🏠</div>
                <h4 className="font-bold text-blue-800 mb-2">Need Food Assistance?</h4>
                <p className="text-gray-600 mb-4">Register your household and browse available donations</p>
                <button 
                  onClick={() => setShowHouseholdForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  Register Household
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Beautiful Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20">
            <div className="flex flex-wrap gap-2 justify-center">
              {/* Overview Tab - always show for multi-role or new users */}
              {(profileView === "overview" || userType === "new") && (
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${
                    activeTab === "overview"
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg transform scale-105"
                      : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                  }`}
                >
                  📊 Overview
                </button>
              )}
              
              {/* Donor Tabs */}
              {(profileView === "donor" || (profileView === "overview" && userType === "both")) && (
                <>
                  <button
                    onClick={() => setActiveTab("donations")}
                    className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${
                      activeTab === "donations"
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                    }`}
                  >
                    🎁 My Donations ({userDonations.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("impact")}
                    className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${
                      activeTab === "impact"
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                    }`}
                  >
                    🌟 Impact & Analytics
                  </button>
                </>
              )}
              
              {/* Applicant Tabs */}
              {(profileView === "applicant" || (profileView === "overview" && userType === "both")) && (
                <>
                  <button
                    onClick={() => setActiveTab("claimed")}
                    className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${
                      activeTab === "claimed"
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                    }`}
                  >
                    🍽️ Received Food ({claimedDonations.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("requests")}
                    className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${
                      activeTab === "requests"
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                    }`}
                  >
                    📝 My Requests ({userRequests.length})
                  </button>
                  {hasHousehold && (
                    <button
                      onClick={() => setActiveTab("household")}
                      className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${
                        activeTab === "household"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform scale-105"
                          : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                      }`}
                    >
                      🏠 Household Details
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Beautiful Tab Content */}
        <div className="space-y-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Recent Activity */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                    🕒 Recent Activity
                  </h3>
                  <div className="text-sm text-gray-500">
                    Last 30 days
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Recent donations */}
                  {userDonations.slice(0, 3).map((donation) => (
                    <div
                      key={`recent-donation-${donation.id}`}
                      className="group flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold">
                          🎁
                        </div>
                        <div>
                          <p className="font-semibold text-green-800">
                            Donated: {donation.foodItem}
                          </p>
                          <p className="text-sm text-green-600">
                            {formatDate(donation.createdAt)} • {donation.location}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          donation.status
                        )}`}
                      >
                        {donation.status}
                      </span>
                    </div>
                  ))}

                  {/* Recent claims */}
                  {claimedDonations.slice(0, 3).map((donation) => (
                    <div
                      key={`recent-claim-${donation.id}`}
                      className="group flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold">
                          🍽️
                        </div>
                        <div>
                          <p className="font-semibold text-blue-800">
                            Received: {donation.foodItem}
                          </p>
                          <p className="text-sm text-blue-600">
                            {formatDate(donation.claimedAt)} • From {donation.donorName || 'Anonymous'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          donation.status
                        )}`}
                      >
                        {donation.status}
                      </span>
                    </div>
                  ))}

                  {/* Recent requests */}
                  {userRequests.slice(0, 2).map((request) => (
                    <div
                      key={`recent-request-${request.id}`}
                      className="group flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-100 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-xl flex items-center justify-center text-white font-bold">
                          📝
                        </div>
                        <div>
                          <p className="font-semibold text-orange-800">
                            Requested: {request.foodType.replace("-", " ")}
                          </p>
                          <p className="text-sm text-orange-600">
                            {formatDate(request.createdAt)} • {request.urgency} priority
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                  ))}

                  {userDonations.length === 0 &&
                    claimedDonations.length === 0 &&
                    userRequests.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🌟</div>
                        <h4 className="text-xl font-bold text-gray-800 mb-2">
                          Your journey starts here!
                        </h4>
                        <p className="text-gray-600 mb-6">
                          Begin sharing food with your community or browse available donations.
                        </p>
                        <div className="flex gap-4 justify-center">
                          <a href="/donate" className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                            🎁 Start Donating
                          </a>
                          <a href="/donations" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                            🔍 Browse Food
                          </a>
                        </div>
                      </div>
                    )}
                </div>
              </div>
              
              {/* Quick Actions for Multi-role Users */}
              {userType === "both" && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-purple-800 mb-6 text-center">
                    🎆 Quick Actions
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg text-center">
                      <div className="text-4xl mb-4">🎁</div>
                      <h4 className="font-bold text-green-800 mb-2">Share More Food</h4>
                      <p className="text-gray-600 mb-4">Help more families with your excess food</p>
                      <a href="/donate" className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                        Donate Now
                      </a>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg text-center">
                      <div className="text-4xl mb-4">🍽️</div>
                      <h4 className="font-bold text-blue-800 mb-2">Find More Food</h4>
                      <p className="text-gray-600 mb-4">Browse available donations in your area</p>
                      <a href="/donations" className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                        Browse Food
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Donations Tab */}
          {activeTab === "donations" && (
            <div>
              {userDonations.length > 0 ? (
                <div className="space-y-6">
                  {userDonations.map((donation) => (
                    <div key={donation.id} className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg">
                            🎁
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">
                              {donation.foodItem}
                            </h3>
                            <p className="text-gray-600 flex items-center mb-2">
                              📍 {donation.location}
                            </p>
                            {donation.claimedBy && (
                              <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                👤 Claimed by household
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(
                            donation.status
                          )}`}
                        >
                          {donation.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50/70 rounded-2xl">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-800">{donation.quantity}</div>
                          <div className="text-xs text-gray-600">Quantity</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-800">{formatDate(donation.createdAt)}</div>
                          <div className="text-xs text-gray-600">Posted</div>
                        </div>
                        {donation.claimedAt && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-800">{formatDate(donation.claimedAt)}</div>
                            <div className="text-xs text-gray-600">Claimed</div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-800">{donation.applicants?.length || 0}</div>
                          <div className="text-xs text-gray-600">Applications</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {donation.status === "available" && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(
                                donation.id,
                                "donations",
                                "completed"
                              )
                            }
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                          >
                            ✅ Mark Complete
                          </button>
                        )}
                        {donation.status === "claimed" && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(
                                donation.id,
                                "donations",
                                "completed"
                              )
                            }
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                          >
                            ✅ Mark Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(donation.id, "donations")}
                          className="px-4 py-2 bg-white border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:border-red-300 hover:bg-red-50 transition-all"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-12 text-center">
                  <div className="text-8xl mb-6">🎁</div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-4">
                    Start Your Donation Journey
                  </h3>
                  <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                    Share your excess food with families in need and make a real difference in your community.
                  </p>
                  <a href="/donate" className="inline-block px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                    🎁 Make Your First Donation
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Impact Tab for Donors */}
          {activeTab === "impact" && (
            <div className="space-y-8">
              {/* Impact Metrics */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 text-center hover:shadow-2xl transition-all duration-300">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg mx-auto mb-4">
                    🤝
                  </div>
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {userDonations.filter((d) => d.claimedBy).length}
                  </div>
                  <div className="text-sm font-medium text-gray-600">Donations Claimed</div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 text-center hover:shadow-2xl transition-all duration-300">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg mx-auto mb-4">
                    👨‍👩‍👧‍👦
                  </div>
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {donationApplications.length}
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    Households Reached
                  </div>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 text-center hover:shadow-2xl transition-all duration-300">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg mx-auto mb-4">
                    ✅
                  </div>
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {
                      userDonations.filter((d) => d.status === "completed")
                        .length
                    }
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    Successful Donations
                  </div>
                </div>
              </div>

              {/* Community Impact Story */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-4">
                    🌟 Your Community Impact
                  </h3>
                </div>
                
                {userDonations.filter((d) => d.claimedBy).length > 0 ? (
                  <div className="space-y-6">
                    {/* Impact Summary */}
                    <div className="text-center p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-100">
                      <p className="text-xl text-gray-700 mb-2">
                        🎉 <strong>Incredible Impact!</strong>
                      </p>
                      <p className="text-lg text-gray-600">
                        Your generosity has directly helped{" "}
                        <span className="font-bold text-green-600 text-2xl">
                          {donationApplications.length}
                        </span>{" "}
                        households in your community.
                      </p>
                    </div>
                    
                    {/* Recent Impact Timeline */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
                      <h4 className="font-bold text-green-800 mb-4 text-lg flex items-center">
                        📅 Recent Impact Timeline
                      </h4>
                      <div className="space-y-3">
                        {userDonations
                          .filter((d) => d.claimedBy)
                          .slice(0, 5)
                          .map((donation) => (
                            <div
                              key={donation.id}
                              className="flex items-center space-x-4 p-3 bg-white/70 rounded-xl border border-green-200"
                            >
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                ✓
                              </div>
                              <div className="flex-1">
                                <p className="text-green-800 font-medium">
                                  {donation.foodItem} helped a local household
                                </p>
                                <p className="text-green-600 text-sm">
                                  {formatDate(donation.claimedAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Encouragement to Continue */}
                    <div className="text-center p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                      <div className="text-4xl mb-3">🚀</div>
                      <h4 className="font-bold text-orange-800 mb-2">Keep Making a Difference!</h4>
                      <p className="text-orange-700 mb-4">
                        Your donations are creating real change. Consider sharing more to help even more families.
                      </p>
                      <a href="/donate" className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                        🎁 Donate More Food
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-8xl mb-6">🌱</div>
                    <h4 className="text-2xl font-bold text-gray-800 mb-4">
                      Your Impact Journey Begins
                    </h4>
                    <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                      Every donation you make helps build a stronger, more caring community. 
                      Your generosity will create ripples of positive change.
                    </p>
                    <a href="/donate" className="inline-block px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                      🌟 Start Your Impact Story
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Claimed Food Tab */}
          {activeTab === "claimed" && (
            <div>
              {claimedDonations.length > 0 ? (
                <div className="space-y-6">
                  {claimedDonations.map((donation) => (
                    <div key={donation.id} className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg">
                            🍽️
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">
                              {donation.foodItem}
                            </h3>
                            <p className="text-gray-600 flex items-center mb-2">
                              📍 {donation.location}
                            </p>
                            <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              👤 From: {donation.donorName || "Anonymous donor"}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(
                            donation.status
                          )}`}
                        >
                          {donation.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-blue-50/70 rounded-2xl">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-800">{donation.quantity}</div>
                          <div className="text-xs text-blue-600">Quantity Received</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-800">{formatDate(donation.claimedAt)}</div>
                          <div className="text-xs text-blue-600">Date Claimed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-800">
                            {donation.expirationDate ? formatDate(donation.expirationDate) : 'N/A'}
                          </div>
                          <div className="text-xs text-blue-600">Best Before</div>
                        </div>
                      </div>

                      <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center">
                          📞 Contact Information
                        </h4>
                        <p className="text-gray-700">{donation.contactInfo}</p>
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                          <p className="text-sm text-green-800">
                            💚 <strong>Remember to say thank you!</strong> A kind message goes a long way in building community connections.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-12 text-center">
                  <div className="text-8xl mb-6">🍽️</div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-4">
                    Start Receiving Community Support
                  </h3>
                  <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                    Browse available food donations in your area and connect with generous community members.
                  </p>
                  <a href="/donations" className="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                    🔍 Browse Available Food
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Requests Tab */}
          {activeTab === "requests" && (
            <div>
              {userRequests.length > 0 ? (
                <div className="space-y-6">
                  {userRequests.map((request) => (
                    <div key={request.id} className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-start space-x-4">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg ${
                            request.urgency === 'urgent' ? 'bg-gradient-to-br from-red-400 to-orange-500' : 'bg-gradient-to-br from-orange-400 to-yellow-500'
                          }`}>
                            {request.urgency === 'urgent' ? '🚨' : '📝'}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">
                              {request.foodType.replace("-", " ")} - {request.quantity}
                            </h3>
                            <p className="text-gray-600 flex items-center mb-2">
                              📍 {request.location}
                            </p>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              request.urgency === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {request.urgency === 'urgent' ? '🚨 Urgent' : '📅 Normal'} Priority
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-orange-50/70 rounded-2xl">
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-800">{request.urgency}</div>
                          <div className="text-xs text-orange-600">Urgency Level</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-800">{formatDate(request.createdAt)}</div>
                          <div className="text-xs text-orange-600">Date Posted</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-800">
                            {request.interestedDonors?.length || 0}
                          </div>
                          <div className="text-xs text-orange-600">Interested Donors</div>
                        </div>
                      </div>

                      {request.description && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-orange-50 rounded-2xl border border-gray-200">
                          <h4 className="font-bold text-gray-800 mb-2">Additional Details:</h4>
                          <p className="text-gray-700">{request.description}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        {request.status === "open" && (
                          <button
                            onClick={() =>
                              handleStatusUpdate(
                                request.id,
                                "requests",
                                "fulfilled"
                              )
                            }
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                          >
                            ✅ Mark Fulfilled
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(request.id, "requests")}
                          className="px-4 py-2 bg-white border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:border-red-300 hover:bg-red-50 transition-all"
                        >
                          🗑️ Delete Request
                        </button>
                        {request.status === "open" && (
                          <a href="/donations" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                            🔍 Browse Donations Instead
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-12 text-center">
                  <div className="text-8xl mb-6">📝</div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-4">
                    Request Specific Food Items
                  </h3>
                  <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                    Can't find what you need? Create a request and donors in your area will be notified when you need specific foods.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <a href="/donations" className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                      🔍 Browse Available Food
                    </a>
                    <button 
                      onClick={() => {/* Add request modal logic */}}
                      className="px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    >
                      📝 Make a Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Household Tab */}
          {activeTab === "household" && hasHousehold && (
            <div className="space-y-8">
              {/* Household Overview */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg">
                      🏠
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">
                        {household.householdName}
                      </h3>
                      <p className="text-gray-600">Registered household profile</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHouseholdForm(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    ✏️ Edit Household
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Household Information */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-100">
                    <h4 className="font-bold text-blue-800 mb-4 text-lg flex items-center">
                      🏠 Household Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <span className="text-blue-600 font-bold w-6">📍</span>
                        <div>
                          <p className="font-medium text-blue-800">Address</p>
                          <p className="text-blue-700">{household.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <span className="text-blue-600 font-bold w-6">📞</span>
                        <div>
                          <p className="font-medium text-blue-800">Contact Phone</p>
                          <p className="text-blue-700">{household.contactPhone}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <span className="text-blue-600 font-bold w-6">👥</span>
                        <div>
                          <p className="font-medium text-blue-800">Household Size</p>
                          <p className="text-blue-700">{getHouseholdSize()} members</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <span className="text-blue-600 font-bold w-6">🏷️</span>
                        <div>
                          <p className="font-medium text-blue-800">Type</p>
                          <p className="text-blue-700">
                            {isLargeHousehold() ? "Large (7+ members)" : "Standard"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <span className="text-blue-600 font-bold w-6">📈</span>
                        <div>
                          <p className="font-medium text-blue-800">Donation Limit</p>
                          <p className="text-blue-700">
                            {Math.round(isLargeHousehold() ? 35 : 30)}% of available quantity
                          </p>
                        </div>
                      </div>
                      {household.emergencyContact && (
                        <div className="flex items-start space-x-3">
                          <span className="text-blue-600 font-bold w-6">🆘</span>
                          <div>
                            <p className="font-medium text-blue-800">Emergency Contact</p>
                            <p className="text-blue-700">{household.emergencyContact}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Household Members */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
                    <h4 className="font-bold text-green-800 mb-4 text-lg flex items-center">
                      👨‍👩‍👧‍👦 Household Members ({getHouseholdSize()})
                    </h4>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {household.members?.map((member, index) => (
                        <div key={index} className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-green-200 shadow-sm">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-green-800">{member.name}</p>
                                {member.isRegistrant && (
                                  <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-bold">
                                    Registrant
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-green-700 mb-1">
                                {member.relationship} • Age {member.age}
                              </p>
                              {member.email && (
                                <p className="text-sm text-green-600">
                                  📧 {member.email}
                                </p>
                              )}
                              {member.phone && (
                                <p className="text-sm text-green-600">
                                  📞 {member.phone}
                                </p>
                              )}
                              {member.dietaryRestrictions && (
                                <div className="mt-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs">
                                  🍽️ Dietary: {member.dietaryRestrictions}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Application History & Statistics */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  📈 Household Activity & Statistics
                </h3>
                
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-100 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold mx-auto mb-3">
                      ✅
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {claimedDonations.length}
                    </div>
                    <div className="text-sm font-medium text-blue-800">
                      Successful Applications
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold mx-auto mb-3">
                      🔄
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {userRequests.filter((r) => r.status === "fulfilled").length}
                    </div>
                    <div className="text-sm font-medium text-green-800">
                      Fulfilled Requests
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold mx-auto mb-3">
                      📊
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {Math.round(((claimedDonations.length + userRequests.filter(r => r.status === 'fulfilled').length) / Math.max(1, claimedDonations.length + userRequests.length)) * 100)}%
                    </div>
                    <div className="text-sm font-medium text-purple-800">
                      Success Rate
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                  {claimedDonations.length > 0 || userRequests.length > 0 ? (
                    <div className="text-center">
                      <div className="text-4xl mb-3">🎆</div>
                      <h4 className="font-bold text-orange-800 mb-2 text-lg">
                        Active Community Member!
                      </h4>
                      <p className="text-orange-700 mb-4">
                        Your household has been actively participating in the community food network. 
                        Keep browsing for available donations or make specific requests when needed.
                      </p>
                      <div className="flex gap-4 justify-center">
                        <a href="/donations" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                          🔍 Browse More Food
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl mb-3">🌟</div>
                      <h4 className="font-bold text-orange-800 mb-2 text-lg">
                        Ready to Get Started!
                      </h4>
                      <p className="text-orange-700 mb-4">
                        Your household is registered and ready to apply for donations. 
                        Start by browsing available food or making specific requests.
                      </p>
                      <div className="flex gap-4 justify-center">
                        <a href="/donations" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                          🔍 Browse Available Food
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Household Registration Modal */}
      {showHouseholdForm && (
        <HouseholdRegistration
          existingHousehold={household}
          onComplete={() => {
            setShowHouseholdForm(false);
            showSuccess(
              household
                ? "Household updated successfully!"
                : "Household registered successfully!"
            );
          }}
          onClose={() => setShowHouseholdForm(false)}
        />
      )}
    </div>
  );
};

export default ProfilePage;
