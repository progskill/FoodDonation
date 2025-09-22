import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { D3BarChart, D3PieChart, D3LineChart, D3DonutChart } from "../components/charts";

const AdminPage = () => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  // State management
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [customRequests, setCustomRequests] = useState([]);
  const [applications, setApplications] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState({});

  // Simple admin check (in production, use proper role-based authentication)
  const isAdmin =
    currentUser?.email === "evansnyamai98@gmail.com" ||
    currentUser?.email?.includes("admin") ||
    currentUser?.uid === "admin-uid";

  useEffect(() => {
    if (!isAdmin) return;

    const subscriptions = [];

    try {
      // Donations subscription
      const donationsQuery = query(collection(db, "donations"));
      const unsubDonations = onSnapshot(donationsQuery, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDonations(data);
      });
      subscriptions.push(unsubDonations);

      // Regular requests subscription
      const requestsQuery = query(collection(db, "requests"));
      const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(data);
      });
      subscriptions.push(unsubRequests);

      // Custom food requests subscription
      const customRequestsQuery = query(collection(db, "food-requests"));
      const unsubCustomRequests = onSnapshot(
        customRequestsQuery,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            type: "custom",
          }));
          setCustomRequests(data);
        }
      );
      subscriptions.push(unsubCustomRequests);

      // Applications subscription
      const applicationsQuery = query(collection(db, "applications"));
      const unsubApplications = onSnapshot(applicationsQuery, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setApplications(data);
      });
      subscriptions.push(unsubApplications);

      // Households subscription
      const householdsQuery = query(collection(db, "households"));
      const unsubHouseholds = onSnapshot(householdsQuery, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHouseholds(data);
        setLoading(false);
      });
      subscriptions.push(unsubHouseholds);
    } catch (error) {
      console.error("Error setting up subscriptions:", error);
      setLoading(false);
    }

    return () => {
      subscriptions.forEach((unsub) => unsub());
    };
  }, [isAdmin]);

  // Calculate stats and chart data whenever data changes
  useEffect(() => {
    calculateStats();
    generateChartData();
  }, [donations, requests, customRequests, applications, households]);

  const calculateStats = () => {
    const allRequests = [...requests, ...customRequests];
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Helper function to check if date is within range
    const isWithinRange = (timestamp, startDate) => {
      if (!timestamp) return false;
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date >= startDate;
    };

    const stats = {
      // Overview stats
      totalDonations: donations.length,
      totalRequests: allRequests.length,
      totalApplications: applications.length,
      totalHouseholds: households.length,

      // Donation stats
      availableDonations: donations.filter(
        (d) => d.status === "available" || d.status === "partially_claimed"
      ).length,
      claimedDonations: donations.filter(
        (d) => d.status === "claimed" || d.status === "fully_booked"
      ).length,
      completedDonations: donations.filter((d) => d.status === "completed")
        .length,

      // Request stats
      openRequests: allRequests.filter((r) => r.status === "open").length,
      fulfilledRequests: allRequests.filter((r) => r.status === "fulfilled")
        .length,

      // Application stats
      approvedApplications: applications.filter((a) => a.status === "approved")
        .length,
      pendingApplications: applications.filter((a) => a.status === "pending")
        .length,
      completedApplications: applications.filter(
        (a) => a.status === "completed"
      ).length,

      // User stats
      uniqueDonors: new Set(donations.map((d) => d.donorId).filter(Boolean))
        .size,
      uniqueRequesters: new Set(
        allRequests.map((r) => r.requesterId).filter(Boolean)
      ).size,
      guestDonors: donations.filter((d) => d.isGuest).length,
      registeredDonors: donations.filter((d) => !d.isGuest).length,

      // Household stats
      totalMembers: households.reduce(
        (sum, h) => sum + (h.members?.length || 0),
        0
      ),
      largeHouseholds: households.filter((h) => (h.members?.length || 0) >= 7)
        .length,
      averageHouseholdSize:
        households.length > 0
          ? (
              households.reduce((sum, h) => sum + (h.members?.length || 0), 0) /
              households.length
            ).toFixed(1)
          : 0,

      // Time-based stats
      donationsToday: donations.filter((d) =>
        isWithinRange(d.createdAt, todayStart)
      ).length,
      donationsThisWeek: donations.filter((d) =>
        isWithinRange(d.createdAt, thisWeekStart)
      ).length,
      donationsThisMonth: donations.filter((d) =>
        isWithinRange(d.createdAt, thisMonthStart)
      ).length,

      requestsToday: allRequests.filter((r) =>
        isWithinRange(r.createdAt, todayStart)
      ).length,
      requestsThisWeek: allRequests.filter((r) =>
        isWithinRange(r.createdAt, thisWeekStart)
      ).length,
      requestsThisMonth: allRequests.filter((r) =>
        isWithinRange(r.createdAt, thisMonthStart)
      ).length,

      // Success metrics
      fulfillmentRate:
        allRequests.length > 0
          ? (
              (allRequests.filter((r) => r.status === "fulfilled").length /
                allRequests.length) *
              100
            ).toFixed(1)
          : 0,

      // Food quantity metrics
      totalServings: donations.reduce(
        (sum, d) =>
          sum + (parseInt(d.quantity) || parseInt(d.originalQuantity) || 0),
        0
      ),
      remainingServings: donations.reduce(
        (sum, d) =>
          sum + (parseInt(d.remainingQuantity) || parseInt(d.quantity) || 0),
        0
      ),
      servedServings: donations.reduce((sum, d) => {
        const original =
          parseInt(d.originalQuantity) || parseInt(d.quantity) || 0;
        const remaining = parseInt(d.remainingQuantity) || original;
        return sum + (original - remaining);
      }, 0),
    };

    setStats(stats);
  };

  const generateChartData = () => {
    // Generate last 7 days data for charts
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    const dailyDonations = last7Days.map((date) => {
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      return donations.filter((d) => {
        if (!d.createdAt) return false;
        const donationDate = d.createdAt.toDate
          ? d.createdAt.toDate()
          : new Date(d.createdAt);
        return donationDate >= dayStart && donationDate < dayEnd;
      }).length;
    });

    const dailyRequests = last7Days.map((date) => {
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const allRequests = [...requests, ...customRequests];
      return allRequests.filter((r) => {
        if (!r.createdAt) return false;
        const requestDate = r.createdAt.toDate
          ? r.createdAt.toDate()
          : new Date(r.createdAt);
        return requestDate >= dayStart && requestDate < dayEnd;
      }).length;
    });

    const labels = last7Days.map((date) =>
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );

    setChartData({
      daily: {
        labels,
        donations: dailyDonations,
        requests: dailyRequests,
      },
      statusDistribution: {
        donations: {
          available: donations.filter((d) => d.status === "available").length,
          claimed: donations.filter((d) => d.status === "claimed").length,
          completed: donations.filter((d) => d.status === "completed").length,
          partiallyBooked: donations.filter(
            (d) => d.status === "partially_claimed"
          ).length,
          fullyBooked: donations.filter((d) => d.status === "fully_booked")
            .length,
        },
        requests: {
          open: [...requests, ...customRequests].filter(
            (r) => r.status === "open"
          ).length,
          fulfilled: [...requests, ...customRequests].filter(
            (r) => r.status === "fulfilled"
          ).length,
        },
      },
    });
  };

  const handleStatusUpdate = async (itemId, collectionName, newStatus) => {
    try {
      setRefreshing(true);
      await updateDoc(doc(db, collectionName, itemId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      showSuccess(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      showError("Failed to update status");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (itemId, collectionName) => {
    if (
      !confirm(
        "Are you sure you want to delete this item? This action cannot be undone."
      )
    )
      return;

    try {
      setRefreshing(true);
      await deleteDoc(doc(db, collectionName, itemId));
      showSuccess("Item deleted successfully");
    } catch (error) {
      console.error("Error deleting item:", error);
      showError("Failed to delete item");
    } finally {
      setRefreshing(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);

      // Recalculate stats and chart data
      calculateStats();
      generateChartData();

      showSuccess("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      showError("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDateShort = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
      case "open":
        return "bg-green-100 text-green-800 border-green-200";
      case "claimed":
      case "partially_claimed":
      case "pending":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "completed":
      case "fulfilled":
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "fully_booked":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Simple Chart Components
  const SimpleBarChart = ({ data, labels, title, color = "#10B981" }) => {
    const maxValue = Math.max(...data, 1);

    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
        <div className="flex items-end justify-between h-32 space-x-1">
          {data.map((value, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div
                className="w-full bg-gray-200 rounded-t"
                style={{ height: "100px" }}
              >
                <div
                  className="w-full rounded-t transition-all duration-500"
                  style={{
                    height: `${(value / maxValue) * 100}%`,
                    backgroundColor: color,
                    minHeight: value > 0 ? "4px" : "0px",
                  }}
                ></div>
              </div>
              <span className="text-xs text-gray-600 mt-1 font-medium">
                {value}
              </span>
              <span className="text-xs text-gray-500">{labels[index]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SimplePieChart = ({ data, title }) => {
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    if (total === 0)
      return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
          <p className="text-gray-500">No data available</p>
        </div>
      );

    const colors = ["#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
        <div className="space-y-3">
          {Object.entries(data).map(([key, value], index) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded mr-3"
                  style={{ backgroundColor: colors[index % colors.length] }}
                ></div>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-800">{value}</span>
                <span className="text-xs text-gray-500 ml-1">
                  ({((value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-200">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the admin panel.
          </p>
          <p className="text-sm text-gray-500">
            Contact the system administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl animate-pulse">🔧</span>
            </div>
          </div>
          <p className="mt-6 text-gray-600 text-xl font-medium">
            Loading Admin Dashboard...
          </p>
          <p className="mt-2 text-gray-500">Fetching system data</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute message="Admin access is restricted to authorized administrators only. Please contact support if you believe you should have admin access.">
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navigation Bar (Red) */}
      <nav className="bg-gradient-to-r from-red-500 to-red-600 shadow-lg h-16 flex items-center justify-between px-6 relative z-50">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button className="lg:hidden w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
            <span className="text-white text-lg">☰</span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl text-white">🔧</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-red-100 text-xs">Community Food Bank Management</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {refreshing && (
            <div className="flex items-center text-white">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
              <span className="text-sm">Updating...</span>
            </div>
          )}

          <div className="flex items-center space-x-3 text-white">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-sm">👤</span>
            </div>
            <div className="text-sm">
              <p className="font-medium">{currentUser?.email?.split('@')[0] || 'Admin'}</p>
              <p className="text-red-100 text-xs">Administrator</p>
            </div>
          </div>

          <button className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
            <span className="text-white text-lg">⚙️</span>
          </button>
        </div>
      </nav>

      {/* Main Layout Container */}
      <div className="flex flex-1">
        {/* Left Sidebar (Green) */}
        <aside className="w-64 bg-gradient-to-b from-green-500 to-green-600 shadow-lg flex flex-col lg:flex hidden lg:w-64 md:w-48">
          <div className="p-6">
            <h2 className="text-white font-bold text-lg mb-6">Navigation</h2>
            <nav className="space-y-2">
              {[
                { id: "dashboard", label: "📊 Dashboard", count: null },
                { id: "donations", label: "🎁 Donations", count: donations.length },
                { id: "requests", label: "📝 Requests", count: requests.length + customRequests.length },
                { id: "households", label: "🏠 Households", count: households.length },
                { id: "applications", label: "📋 Applications", count: applications.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white shadow-lg transform scale-105"
                      : "text-green-100 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-3">
                      <span className="text-lg">{tab.label.split(' ')[0]}</span>
                      <span className="font-medium">{tab.label.split(' ').slice(1).join(' ')}</span>
                    </span>
                    {tab.count !== null && (
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        activeTab === tab.id
                          ? "bg-white/30 text-white"
                          : "bg-green-400 text-green-900"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto p-6 border-t border-green-400/30">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-white text-lg">📊</span>
                <span className="text-white font-medium">Quick Stats</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-green-100">
                  <span>Total Users:</span>
                  <span className="font-bold text-white">{households.length}</span>
                </div>
                <div className="flex justify-between text-green-100">
                  <span>Active Donations:</span>
                  <span className="font-bold text-white">{donations.filter(d => d.status === 'available').length}</span>
                </div>
                <div className="flex justify-between text-green-100">
                  <span>Pending Apps:</span>
                  <span className="font-bold text-white">{applications.filter(a => a.status === 'pending').length}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area (Blue) */}
        <main className="flex-1 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 overflow-auto">
          <div className="p-4 lg:p-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 min-h-[calc(100vh-12rem)] p-4 lg:p-8">
                {/* Content Header */}
                <div className="border-b border-white/20 pb-6 mb-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-white capitalize">
                        {activeTab === "dashboard" ? "📊 Dashboard Overview" :
                         activeTab === "donations" ? "🎁 Donations Management" :
                         activeTab === "requests" ? "📝 Requests Management" :
                         activeTab === "households" ? "🏠 Households Management" :
                         activeTab === "applications" ? "📋 Applications Management" : "Admin Panel"}
                      </h1>
                      <p className="text-blue-100 mt-2">
                        {activeTab === "dashboard" ? "Real-time insights and analytics" :
                         activeTab === "donations" ? "Monitor and manage food donations" :
                         activeTab === "requests" ? "Review and process food requests" :
                         activeTab === "households" ? "Manage registered households" :
                         activeTab === "applications" ? "Review donation applications" : "Administrative controls"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center space-x-2">
                        <span>📊</span>
                        <span>Export</span>
                      </button>
                      <button
                        onClick={refreshData}
                        disabled={refreshing}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
                      >
                        <span className={refreshing ? "animate-spin" : ""}>🔄</span>
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="text-white">

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-6 rounded-2xl text-white shadow-lg">
                <div className="text-3xl font-bold">{stats.totalDonations}</div>
                <div className="text-green-100 text-sm">Total Donations</div>
                <div className="text-xs text-green-200 mt-1">
                  +{stats.donationsToday} today
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
                <div className="text-3xl font-bold">{stats.totalRequests}</div>
                <div className="text-blue-100 text-sm">Total Requests</div>
                <div className="text-xs text-blue-200 mt-1">
                  +{stats.requestsToday} today
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
                <div className="text-3xl font-bold">
                  {stats.totalHouseholds}
                </div>
                <div className="text-purple-100 text-sm">Households</div>
                <div className="text-xs text-purple-200 mt-1">
                  {stats.totalMembers} members
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-6 rounded-2xl text-white shadow-lg">
                <div className="text-3xl font-bold">
                  {stats.fulfillmentRate}%
                </div>
                <div className="text-orange-100 text-sm">Success Rate</div>
                <div className="text-xs text-orange-200 mt-1">
                  Request fulfillment
                </div>
              </div>
              <div className="bg-gradient-to-br from-teal-400 to-teal-600 p-6 rounded-2xl text-white shadow-lg">
                <div className="text-3xl font-bold">{stats.totalServings}</div>
                <div className="text-teal-100 text-sm">Total Servings</div>
                <div className="text-xs text-teal-200 mt-1">
                  {stats.servedServings} served
                </div>
              </div>
              <div className="bg-gradient-to-br from-pink-400 to-pink-600 p-6 rounded-2xl text-white shadow-lg">
                <div className="text-3xl font-bold">
                  {stats.uniqueDonors + stats.uniqueRequesters}
                </div>
                <div className="text-pink-100 text-sm">Active Users</div>
                <div className="text-xs text-pink-200 mt-1">
                  {stats.uniqueDonors} donors
                </div>
              </div>
            </div>

            {/* Interactive Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <D3BarChart
                data={chartData.daily?.donations || []}
                labels={chartData.daily?.labels || []}
                title="📈 Daily Donations (Last 7 Days)"
                color="#10B981"
                height={300}
                width={500}
                showTooltip={true}
                animationDuration={750}
              />
              <D3BarChart
                data={chartData.daily?.requests || []}
                labels={chartData.daily?.labels || []}
                title="📊 Daily Requests (Last 7 Days)"
                color="#3B82F6"
                height={300}
                width={500}
                showTooltip={true}
                animationDuration={750}
              />
            </div>

            {/* Combined Line Chart */}
            <div className="grid grid-cols-1 gap-6">
              <D3LineChart
                data={{
                  labels: chartData.daily?.labels || [],
                  donations: chartData.daily?.donations || [],
                  requests: chartData.daily?.requests || []
                }}
                title="📊 Daily Activity Trends (Last 7 Days)"
                height={350}
                width={800}
                showTooltip={true}
                animationDuration={1000}
                colors={["#10B981", "#3B82F6"]}
              />
            </div>

            {/* Interactive Status Distribution Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <D3DonutChart
                data={chartData.statusDistribution?.donations || {}}
                title="🎁 Donation Status Distribution"
                width={400}
                height={400}
                showTooltip={true}
                showCenterText={true}
                animationDuration={750}
              />
              <D3PieChart
                data={chartData.statusDistribution?.requests || {}}
                title="📝 Request Status Distribution"
                width={400}
                height={400}
                showTooltip={true}
                showLegend={true}
                animationDuration={750}
              />
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  🎁 Donation Analytics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available:</span>
                    <span className="font-bold text-green-600">
                      {stats.availableDonations}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Claimed:</span>
                    <span className="font-bold text-orange-600">
                      {stats.claimedDonations}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-bold text-blue-600">
                      {stats.completedDonations}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">This Week:</span>
                    <span className="font-bold text-purple-600">
                      {stats.donationsThisWeek}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">This Month:</span>
                    <span className="font-bold text-indigo-600">
                      {stats.donationsThisMonth}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  📝 Request Analytics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Open:</span>
                    <span className="font-bold text-green-600">
                      {stats.openRequests}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fulfilled:</span>
                    <span className="font-bold text-blue-600">
                      {stats.fulfilledRequests}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="font-bold text-purple-600">
                      {stats.fulfillmentRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">This Week:</span>
                    <span className="font-bold text-orange-600">
                      {stats.requestsThisWeek}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">This Month:</span>
                    <span className="font-bold text-indigo-600">
                      {stats.requestsThisMonth}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  🏠 Household Analytics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Members:</span>
                    <span className="font-bold text-blue-600">
                      {stats.totalMembers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Size:</span>
                    <span className="font-bold text-green-600">
                      {stats.averageHouseholdSize}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Large (7+):</span>
                    <span className="font-bold text-purple-600">
                      {stats.largeHouseholds}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Applications:</span>
                    <span className="font-bold text-orange-600">
                      {stats.totalApplications}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Approved:</span>
                    <span className="font-bold text-indigo-600">
                      {stats.approvedApplications}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Donations Tab */}
        {activeTab === "donations" && (
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                🎁 Donations Management ({donations.length})
              </h2>

              {donations.length > 0 ? (
                <div className="space-y-4">
                  {donations.map((donation) => (
                    <div
                      key={donation.id}
                      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {donation.foodItem}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">📍</span>
                              {donation.location}
                            </div>
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">👤</span>
                              {donation.donorName || "Anonymous"} (
                              {donation.isGuest ? "Guest" : "Registered"})
                            </div>
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">📞</span>
                              {donation.contactInfo}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              donation.status
                            )}`}
                          >
                            {donation.status}
                          </span>
                          {donation.isUrgent && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full animate-pulse">
                              🚨 Urgent
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <div className="font-bold text-gray-800">
                            {donation.quantity ||
                              donation.originalQuantity ||
                              "N/A"}
                          </div>
                          <div className="text-xs text-gray-600">
                            Original Qty
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-green-600">
                            {donation.remainingQuantity ||
                              donation.quantity ||
                              "N/A"}
                          </div>
                          <div className="text-xs text-gray-600">Remaining</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">
                            {donation.applicants?.length || 0}
                          </div>
                          <div className="text-xs text-gray-600">
                            Applications
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-purple-600">
                            {formatDateShort(donation.createdAt)}
                          </div>
                          <div className="text-xs text-gray-600">Posted</div>
                        </div>
                      </div>

                      {donation.description && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Description:</strong> {donation.description}
                          </p>
                        </div>
                      )}

                      {donation.expirationDate && (
                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>⏰ Expires:</strong>{" "}
                            {formatDate(donation.expirationDate)}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <select
                          value={donation.status}
                          onChange={(e) =>
                            handleStatusUpdate(
                              donation.id,
                              "donations",
                              e.target.value
                            )
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          disabled={refreshing}
                        >
                          <option value="available">Available</option>
                          <option value="partially_claimed">
                            Partially Claimed
                          </option>
                          <option value="fully_booked">Fully Booked</option>
                          <option value="completed">Completed</option>
                        </select>
                        <button
                          onClick={() => handleDelete(donation.id, "donations")}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                          disabled={refreshing}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎁</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    No donations found
                  </h3>
                  <p className="text-gray-600">
                    Donations will appear here when users post them.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                📝 Requests Management (
                {requests.length + customRequests.length})
              </h2>

              {/* Regular Requests */}
              {requests.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    📋 Regular Requests ({requests.length})
                  </h3>
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-800 mb-2">
                              {request.foodType?.replace("-", " ") ||
                                "Food Request"}{" "}
                              - {request.quantity}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <span className="w-4 h-4 mr-2">📍</span>
                                {request.location}
                              </div>
                              <div className="flex items-center">
                                <span className="w-4 h-4 mr-2">👤</span>
                                {request.requesterName || "Anonymous"} (
                                {request.isGuest ? "Guest" : "Registered"})
                              </div>
                              <div className="flex items-center">
                                <span className="w-4 h-4 mr-2">📞</span>
                                {request.contactInfo}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                request.status
                              )}`}
                            >
                              {request.status}
                            </span>
                            {request.urgency && (
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${getUrgencyColor(
                                  request.urgency
                                )}`}
                              >
                                {request.urgency}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <div className="font-bold text-gray-800">
                              {request.urgency || "Normal"}
                            </div>
                            <div className="text-xs text-gray-600">Urgency</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-600">
                              {formatDateShort(request.createdAt)}
                            </div>
                            <div className="text-xs text-gray-600">Posted</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-purple-600">
                              {request.fulfilledAt
                                ? formatDateShort(request.fulfilledAt)
                                : "N/A"}
                            </div>
                            <div className="text-xs text-gray-600">
                              Fulfilled
                            </div>
                          </div>
                        </div>

                        {request.description && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <strong>Description:</strong>{" "}
                              {request.description}
                            </p>
                          </div>
                        )}

                        {request.dietary && (
                          <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                            <p className="text-sm text-orange-700">
                              <strong>🍽️ Dietary Needs:</strong>{" "}
                              {request.dietary}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                          <select
                            value={request.status}
                            onChange={(e) =>
                              handleStatusUpdate(
                                request.id,
                                "requests",
                                e.target.value
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            disabled={refreshing}
                          >
                            <option value="open">Open</option>
                            <option value="fulfilled">Fulfilled</option>
                          </select>
                          <button
                            onClick={() => handleDelete(request.id, "requests")}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                            disabled={refreshing}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Food Requests */}
              {customRequests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    🎯 Custom Food Requests ({customRequests.length})
                  </h3>
                  <div className="space-y-4">
                    {customRequests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-800 mb-2">
                              {request.foodItem} - {request.quantity}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <span className="w-4 h-4 mr-2">📍</span>
                                {request.location || "No location specified"}
                              </div>
                              <div className="flex items-center">
                                <span className="w-4 h-4 mr-2">👤</span>
                                {request.requesterName || "Anonymous"} (
                                {request.isGuest ? "Guest" : "Registered"})
                              </div>
                              <div className="flex items-center">
                                <span className="w-4 h-4 mr-2">📞</span>
                                {request.contactInfo}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                request.status
                              )}`}
                            >
                              {request.status}
                            </span>
                            {request.urgency && (
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${getUrgencyColor(
                                  request.urgency
                                )}`}
                              >
                                {request.urgency}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <div className="font-bold text-gray-800">
                              {request.urgency || "Normal"}
                            </div>
                            <div className="text-xs text-gray-600">Urgency</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-600">
                              {formatDateShort(request.createdAt)}
                            </div>
                            <div className="text-xs text-gray-600">Posted</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-purple-600">
                              {request.interestedDonors?.length || 0}
                            </div>
                            <div className="text-xs text-gray-600">
                              Interested
                            </div>
                          </div>
                        </div>

                        {request.description && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <strong>Description:</strong>{" "}
                              {request.description}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                          <select
                            value={request.status}
                            onChange={(e) =>
                              handleStatusUpdate(
                                request.id,
                                "food-requests",
                                e.target.value
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            disabled={refreshing}
                          >
                            <option value="open">Open</option>
                            <option value="fulfilled">Fulfilled</option>
                          </select>
                          <button
                            onClick={() =>
                              handleDelete(request.id, "food-requests")
                            }
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                            disabled={refreshing}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {requests.length === 0 && customRequests.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    No requests found
                  </h3>
                  <p className="text-gray-600">
                    Food requests will appear here when users submit them.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Households Tab */}
        {activeTab === "households" && (
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                🏠 Households Management ({households.length})
              </h2>

              {households.length > 0 ? (
                <div className="space-y-6">
                  {households.map((household) => (
                    <div
                      key={household.id}
                      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {household.householdName}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">📍</span>
                              {household.address}
                            </div>
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">📞</span>
                              {household.contactPhone}
                            </div>
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">🆘</span>
                              Emergency: {household.emergencyContact}
                            </div>
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">📅</span>
                              Registered: {formatDateShort(household.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              (household.members?.length || 0) >= 7
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}
                          >
                            {household.members?.length || 0} members{" "}
                            {(household.members?.length || 0) >= 7 && "(Large)"}
                          </span>
                        </div>
                      </div>

                      {/* Household Members */}
                      <div className="mb-4">
                        <h4 className="font-bold text-gray-800 mb-3">
                          👥 Household Members:
                        </h4>
                        <div className="grid gap-3">
                          {household.members?.map((member, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-bold text-blue-600">
                                    {member.name?.charAt(0) || "?"}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-800">
                                    {member.name}{" "}
                                    {member.isRegistrant && "(Registrant)"}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {member.email} • {member.relationship} •
                                    Age: {member.age}
                                  </div>
                                  {member.dietaryRestrictions && (
                                    <div className="text-xs text-orange-600">
                                      🍽️ {member.dietaryRestrictions}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.phone}
                              </div>
                            </div>
                          )) || (
                            <div className="text-center py-4 text-gray-500">
                              No member information available
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Household Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <div className="font-bold text-blue-600">
                            {
                              applications.filter(
                                (app) => app.householdId === household.id
                              ).length
                            }
                          </div>
                          <div className="text-xs text-gray-600">
                            Applications
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-green-600">
                            {
                              applications.filter(
                                (app) =>
                                  app.householdId === household.id &&
                                  app.status === "approved"
                              ).length
                            }
                          </div>
                          <div className="text-xs text-gray-600">Approved</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-purple-600">
                            {(household.members?.length || 0) >= 7
                              ? "35%"
                              : "30%"}
                          </div>
                          <div className="text-xs text-gray-600">
                            Max Donation %
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-orange-600">
                            {household.registrantId ? "Verified" : "Unverified"}
                          </div>
                          <div className="text-xs text-gray-600">Status</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() =>
                            handleDelete(household.id, "households")
                          }
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                          disabled={refreshing}
                        >
                          🗑️ Delete Household
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏠</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    No households found
                  </h3>
                  <p className="text-gray-600">
                    Registered households will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                📋 Applications Management ({applications.length})
              </h2>

              {applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-800 mb-2">
                            {application.donationTitle} - {application.quantity}{" "}
                            servings
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">🏠</span>
                              {application.householdName} (
                              {application.householdSize} members)
                            </div>
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">👤</span>
                              {application.applicantName}
                            </div>
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">📍</span>
                              {application.pickupLocation}
                            </div>
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2">📞</span>
                              {application.donorContact}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              application.status
                            )}`}
                          >
                            {application.status}
                          </span>
                          {application.isLargeHousehold && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                              Large Household
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <div className="font-bold text-blue-600">
                            {application.quantity}
                          </div>
                          <div className="text-xs text-gray-600">Quantity</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-purple-600">
                            {application.maxPercentage}%
                          </div>
                          <div className="text-xs text-gray-600">
                            Max Allowed
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-green-600">
                            {application.applicationDate}
                          </div>
                          <div className="text-xs text-gray-600">
                            Date Applied
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-orange-600">
                            {formatDateShort(application.createdAt)}
                          </div>
                          <div className="text-xs text-gray-600">Created</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <select
                          value={application.status}
                          onChange={(e) =>
                            handleStatusUpdate(
                              application.id,
                              "applications",
                              e.target.value
                            )
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          disabled={refreshing}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <button
                          onClick={() =>
                            handleDelete(application.id, "applications")
                          }
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                          disabled={refreshing}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    No applications found
                  </h3>
                  <p className="text-gray-600">
                    Donation applications will appear here when users apply.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

                </div>
            </div>
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
};

export default AdminPage;
