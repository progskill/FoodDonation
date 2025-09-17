import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Navbar from "./components/layout/Navbar";
import NotificationToast from "./components/common/NotificationToast";
import Home from "./pages/Home";
import DonatePage from "./pages/DonatePage";
import ReceivePage from "./pages/ReceivePage";
import DonationsPage from "./pages/DonationsPage";
import RequestsPage from "./pages/RequestsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="pt-16">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/donate" element={<DonatePage />} />
                <Route path="/receive" element={<ReceivePage />} />
                <Route path="/donations" element={<DonationsPage />} />
                <Route path="/requests" element={<RequestsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
            </main>
            <NotificationToast />
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
