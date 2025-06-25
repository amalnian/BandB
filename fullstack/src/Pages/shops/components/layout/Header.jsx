// components/layout/Header.js
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaBars, FaBell } from 'react-icons/fa';
import { getNotifications } from '../../../../endpoints/ShopAPI';

const Header = ({ sidebarOpen, setSidebarOpen, shopData, isApproved }) => {
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isApproved) {
      fetchNotifications();
    }
  }, [isApproved]);

  const fetchNotifications = async () => {
    try {
      const response = await getNotifications();
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
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

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 mr-4"
          >
            <FaBars />
          </button>
          <h2 className="text-xl font-semibold text-gray-800">
            {getPageTitle()}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {isApproved && (
            <div className="relative">
              <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full">
                <FaBell />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {shopData?.name?.charAt(0) || 'S'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden md:block">
              {shopData?.name || "Your Shop"}
            </span>
            {!isApproved && (
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">Pending</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;