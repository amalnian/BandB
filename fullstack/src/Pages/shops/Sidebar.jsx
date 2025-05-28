import React from 'react';
import { 
  FaStore, 
  FaShoppingBag, 
  FaCalendarAlt, 
  FaUsers, 
  FaChartLine, 
  FaCog, 
  FaSignOutAlt,
  FaExclamationTriangle
} from 'react-icons/fa';

const Sidebar = ({ 
  sidebarOpen, 
  shopData, 
  isApproved, 
  currentSection, 
  navigateToSection,
  handleLogout 
}) => {
  return (
    <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-10 w-64 bg-blue-800 text-white transition-transform duration-300 ease-in-out transform`}>
      <div className="p-6 border-b border-blue-700">
        <div className="flex items-center space-x-3">
          <FaStore className="text-2xl" />
          <h1 className="text-xl font-bold">Shop Dashboard</h1>
        </div>
        <p className="mt-2 text-blue-200 text-sm truncate">
          {shopData?.name || "Your Shop"}
        </p>
      </div>
      
      {/* Show approval status indicator if not approved */}
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
          <li>
            <button 
              onClick={() => navigateToSection("dashboard")}
              className={`flex w-full items-center px-4 py-3 text-blue-100 ${
                currentSection === "dashboard" 
                  ? "bg-blue-900 bg-opacity-50" 
                  : "hover:bg-blue-700"
              } rounded-lg transition duration-200 ${!isApproved ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!isApproved}
            >
              <FaChartLine className="mr-3" />
              <span>Dashboard</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => navigateToSection("appointments")}
              className={`flex w-full items-center px-4 py-3 text-blue-100 ${
                currentSection === "appointments" 
                  ? "bg-blue-900 bg-opacity-50" 
                  : "hover:bg-blue-700"
              } rounded-lg transition duration-200 ${!isApproved ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!isApproved}
            >
              <FaCalendarAlt className="mr-3" />
              <span>Appointments</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => navigateToSection("services")}
              className={`flex w-full items-center px-4 py-3 text-blue-100 ${
                currentSection === "services" 
                  ? "bg-blue-900 bg-opacity-50" 
                  : "hover:bg-blue-700"
              } rounded-lg transition duration-200 ${!isApproved ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!isApproved}
            >
              <FaShoppingBag className="mr-3" />
              <span>Services</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => navigateToSection("customers")}
              className={`flex w-full items-center px-4 py-3 text-blue-100 ${
                currentSection === "customers" 
                  ? "bg-blue-900 bg-opacity-50" 
                  : "hover:bg-blue-700"
              } rounded-lg transition duration-200 ${!isApproved ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!isApproved}
            >
              <FaUsers className="mr-3" />
              <span>Customers</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => navigateToSection("analytics")}
              className={`flex w-full items-center px-4 py-3 text-blue-100 ${
                currentSection === "analytics" 
                  ? "bg-blue-900 bg-opacity-50" 
                  : "hover:bg-blue-700"
              } rounded-lg transition duration-200 ${!isApproved ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!isApproved}
            >
              <FaChartLine className="mr-3" />
              <span>Analytics</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => navigateToSection("settings")}
              className={`flex w-full items-center px-4 py-3 text-blue-100 ${
                currentSection === "settings" 
                  ? "bg-blue-900 bg-opacity-50" 
                  : "hover:bg-blue-700"
              } rounded-lg transition duration-200`}
            >
              <FaCog className="mr-3" />
              <span>Settings</span>
              {!isApproved && (
                <span className="ml-auto bg-yellow-500 text-xs px-2 py-1 rounded">Required</span>
              )}
            </button>
          </li>
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