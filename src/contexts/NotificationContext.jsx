import React from "react";
import { createContext, useContext, useState } from "react";

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now();
    const newNotification = { id, ...notification };
    setNotifications((prev) => [...prev, newNotification]);

    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const showSuccess = (message) => {
    addNotification({
      type: "success",
      title: "Success",
      message,
    });
  };

  const showError = (message) => {
    addNotification({
      type: "error",
      title: "Error",
      message,
    });
  };

  const showInfo = (message) => {
    addNotification({
      type: "info",
      title: "Info",
      message,
    });
  };

  const notifyNewDonation = (donation) => {
    addNotification({
      type: "info",
      title: "New Donation Available!",
      message: `${donation.foodItem} is now available for pickup at ${donation.location}`,
      duration: 8000,
    });
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo,
    notifyNewDonation,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
