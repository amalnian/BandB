// components/layout/Header.js
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaBars, FaBell } from 'react-icons/fa';
import { getNotifications } from '@/endpoints/APIs';
import NotificationDropdown from "@/Pages/user/components/NotificationDropdown"

const Header = ({ sidebarOpen, setSidebarOpen, shopData, isApproved }) => {
  const location = useLocation();
  // Initialize notifications as an empty array
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isApproved) {
      fetchNotifications();
    }
  }, [isApproved]);

  const fetchNotifications = async () => {
    try {
      const response = await getNotifications();
      // Ensure response.data is an array
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Set to empty array on error
      setNotifications([]);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/shop/dashboard': return 'Dashboard Overview';
      case '/shop/appointments': return 'Appointments';
      case '/shop/services': return 'Services';
      case '/shop/customers': return 'Customers';
      case '/shop/analytics': return 'Analytics';
      case '/shop/settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  // Safe filtering with additional checks
  const unreadNotifications = Array.isArray(notifications) 
    ? notifications.filter(n => !n.read).length 
    : 0;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 mr-4"
          >
            <FaBars />
          </button>
          
          <h1 className="text-xl font-semibold text-gray-800">
            {getPageTitle()}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {isApproved && (
            <div className="relative">
              <div className="relative">
                {unreadNotifications > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </div>
              <NotificationDropdown />
            </div>
          )}
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
              {shopData?.name?.charAt(0) || 'S'}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-medium text-gray-900">
                {shopData?.name || "Your Shop"}
              </div>
              {!isApproved && (
                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                  Pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;