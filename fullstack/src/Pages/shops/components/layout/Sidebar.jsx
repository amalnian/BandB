// Updated Sidebar.js to handle payments link correctly with toast notifications

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast, { Toaster } from "react-hot-toast";
import { 
  FaStore, FaShoppingBag, FaCalendarAlt, FaUsers, 
  FaChartLine, FaCog, FaSignOutAlt, FaTimes, FaExclamationTriangle 
} from 'react-icons/fa';
import { logout as logoutAPI } from '../../../../endpoints/ShopAPI';

const Sidebar = ({ sidebarOpen, setSidebarOpen, shopData, isApproved }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const loadingToast = toast.loading("Signing out...");
    
    try {
      await logoutAPI();
      
      // Show success toast
      toast.dismiss(loadingToast);
      toast.success("Logged out successfully");
      
    } catch (error) {
      console.error("Logout API error:", error);
      
      // Show error toast but still proceed with logout
      toast.dismiss(loadingToast);
      toast.error("Logout request failed, but you've been signed out locally");
      
    } finally {
      localStorage.removeItem("shop_data");
      localStorage.removeItem("user_data");
      
      // Navigate after a short delay to show the toast
      setTimeout(() => {
        navigate("/shop/login");
      }, 1000);
    }
  };

  // Get shopId from shopData
  const shopId = shopData?.id || shopData?.shop_id;

  const menuItems = [
    { path: '/shop/dashboard', icon: FaChartLine, label: 'Dashboard', requiresApproval: true },
    { path: '/shop/appointments', icon: FaCalendarAlt, label: 'Appointments', requiresApproval: true },
    { path: '/shop/services', icon: FaShoppingBag, label: 'Services', requiresApproval: true },
    { path: '/shop/chat', icon: FaUsers, label: 'Chats', requiresApproval: true },
    { path: '/shop/feedbacks', icon: FaChartLine, label: 'Feedbacks', requiresApproval: true },
    { 
      // Option 1: If using nested route
      path: '/shop/payments', 
      // Option 2: If using shopId in URL (uncomment this line and comment above)
      // path: `/shop/${shopId}/payments`,
      icon: FaChartLine, 
      label: 'Payments', 
      requiresApproval: true 
    },
    { path: '/shop/settings', icon: FaCog, label: 'Settings', requiresApproval: false },
  ];

  const handleNavClick = (item, e) => {
    if (!isApproved && item.requiresApproval) {
      e.preventDefault();
      toast.error('Please complete your shop profile and wait for approval to access other features.');
      return;
    }
    
    // If payments link and no shopId, prevent navigation
    if (item.path.includes('payments') && !shopId) {
      e.preventDefault();
      toast.error('Shop ID not available. Please try logging out and back in.');
      return;
    }
  };

  return (
    <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-10 w-64 bg-blue-800 text-white transition-transform duration-300 ease-in-out transform`}>
      {/* Toast container - only show when sidebar is open on mobile or always on desktop */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>

      <div className="p-6 border-b border-blue-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaStore className="text-2xl" />
            <h1 className="text-xl font-bold">Shop Dashboard</h1>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white"
          >
            <FaTimes />
          </button>
        </div>
        <p className="mt-2 text-blue-200 text-sm truncate">
          {shopData?.name || "Your Shop"}
        </p>
        {/* Debug info - remove in production */}
        <p className="mt-1 text-blue-200 text-xs">
          ID: {shopId || 'Not available'}
        </p>
      </div>
      
      {!isApproved && (
        <div className="mx-4 mt-4 px-3 py-2 bg-yellow-500 text-white text-sm rounded-md">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <span>Pending Approval</span>
          </div>
        </div>
      )}
      
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isDisabled = !isApproved && item.requiresApproval;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={(e) => handleNavClick(item, e)}
                  className={`flex items-center px-4 py-3 text-blue-100 rounded-lg transition duration-200 ${
                    isActive 
                      ? "bg-blue-900 bg-opacity-50" 
                      : "hover:bg-blue-700"
                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Icon className="mr-3" />
                  <span>{item.label}</span>
                  {!isApproved && item.path === '/shop/settings' && (
                    <span className="ml-auto bg-yellow-500 text-xs px-2 py-1 rounded">Required</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="absolute bottom-0 w-full p-4">
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center w-full px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg transition duration-200"
        >
          <FaSignOutAlt className="mr-2" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;