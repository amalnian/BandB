import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaStore, 
  FaShoppingBag, 
  FaCalendarAlt, 
  FaUsers, 
  FaChartLine, 
  FaCog, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaBell,
  FaMoneyBillWave,
  FaCalendarCheck,
  FaUserFriends,
  FaClipboardList,
  FaExclamationTriangle,
  FaLock
} from 'react-icons/fa';
import { 
  Clock, 
  Calendar, 
  Save, 
  Edit, 
  Trash2, 
  Plus, 
  X, 
  AlertCircle,
  DollarSign,
  Clock4,
  Tag
} from 'lucide-react';
import {
  getShopProfile,
  updateShopProfile,
  getDashboardStats,
  getRecentAppointments,
  getNotifications,
  getBusinessHours,
  updateBusinessHours,
  getSpecialClosingDays,
  addSpecialClosingDay,
  removeSpecialClosingDay,
  logout as logoutAPI
} from '@/endpoints/ShopAPI';

export default function ShopDashboard() {
  const [shopData, setShopData] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isApproved, setIsApproved] = useState(false);
  const [currentSection, setCurrentSection] = useState("dashboard");
  
  const navigate = useNavigate();

// Fixed fetchDashboardData function
// Fixed fetchDashboardData function
const fetchDashboardData = async () => {
  try {
    setIsLoading(true);
    setError("");

    // Always fetch shop profile from API
    const shopResponse = await getShopProfile();
    
    // Debug: Check the actual response structure
    console.log("Shop API Response:", shopResponse);
    
    // Your API returns: { success: true, data: { shop data } }
    // So we need to access shopResponse.data.data
    let shopProfileData;
    if (shopResponse.data && shopResponse.data.data) {
      shopProfileData = shopResponse.data.data;
    } else if (shopResponse.success && shopResponse.data) {
      // If the response is already parsed and we have direct access
      shopProfileData = shopResponse.data;
    } else {
      console.error("Unexpected API response structure:", shopResponse);
      throw new Error("Invalid shop profile response structure");
    }
    
    console.log("Parsed Shop Data:", shopProfileData);
    
    setShopData(shopProfileData);
    setIsApproved(shopProfileData.is_approved || false);
    
    // Store shop data in localStorage for UI purposes
    localStorage.setItem("shop_data", JSON.stringify(shopProfileData));
    
    // If not approved, automatically set the current section to settings
    if (!shopProfileData.is_approved) {
      setCurrentSection("settings");
    }
    
    // Only fetch other dashboard data if the shop is approved
    if (shopProfileData.is_approved) {
      try {
        // Fetch all dashboard data concurrently
        const [statsResponse, appointmentsResponse, notificationsResponse] = await Promise.allSettled([
          getDashboardStats(),
          getRecentAppointments(),
          getNotifications()
        ]);

        // Handle stats response - check response structure
        if (statsResponse.status === 'fulfilled') {
          const statsData = statsResponse.value.data || statsResponse.value;
          setStats(statsData);
        } else {
          console.error("Error fetching stats:", statsResponse.reason);
        }

        // Handle appointments response - check response structure  
        if (appointmentsResponse.status === 'fulfilled') {
          const appointmentsData = appointmentsResponse.value.data || appointmentsResponse.value;
          setRecentAppointments(appointmentsData);
        } else {
          console.error("Error fetching appointments:", appointmentsResponse.reason);
        }

        // Handle notifications response - check response structure
        if (notificationsResponse.status === 'fulfilled') {
          const notificationsData = notificationsResponse.value.data || notificationsResponse.value;
          setNotifications(notificationsData);
        } else {
          console.error("Error fetching notifications:", notificationsResponse.reason);
        }

      } catch (dashboardError) {
        console.error("Error fetching dashboard data:", dashboardError);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
    setError(error.message || "Failed to load dashboard data");
    
    // Check if it's an authentication error
    if (error.response?.status === 401) {
      handleAuthenticationError();
    }
  } finally {
    setIsLoading(false);
  }
};

  const handleAuthenticationError = () => {
    // Only clear localStorage data, cookies will be handled by the server
    localStorage.removeItem("shop_data");
    navigate("/shop/login");
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update currentSection when isApproved changes
  useEffect(() => {
    if (!isApproved && currentSection !== "settings") {
      setCurrentSection("settings");
    }
  }, [isApproved, currentSection]);

  const handleLogout = async () => {
    try {
      // Call logout API to clear cookies on server side
      await logoutAPI();
    } catch (error) {
      console.error("Logout API error:", error);
      // Continue with logout even if API call fails
    } finally {
      // Clear only localStorage data (cookies are handled by server)
      localStorage.removeItem("shop_data");
      // Redirect to login
      navigate("/shop/login");
    }
  };

  // Navigate to different sections - strict access control
  const navigateToSection = (section) => {
    // If shop is not approved, only allow access to settings
    if (!isApproved && section !== "settings") {
      alert("Please complete your shop profile and wait for approval to access other features.");
      return;
    }
    setCurrentSection(section);
  };

  // Save settings function
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const updatedShopData = {
      name: formData.get('shopName'),
      phone: formData.get('phone'),
      owner_name: formData.get('ownerName'),
      address: formData.get('address'),
      description: formData.get('description'),
      opening_hours: formData.get('openingHours')
    };
    
    try {
      const response = await updateShopProfile(updatedShopData);
      const updatedData = response.data;
      
      setShopData(updatedData);
      localStorage.setItem("shop_data", JSON.stringify(updatedData));
      
      // Check if approval status changed
      if (updatedData.is_approved !== isApproved) {
        setIsApproved(updatedData.is_approved);
        
        // If newly approved, refresh dashboard data
        if (updatedData.is_approved) {
          fetchDashboardData();
        }
      }
      
      // Show success message
      alert("Settings updated successfully!");
      
    } catch (error) {
      console.error("Error saving settings:", error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        // Authentication error - interceptor should handle this
        return;
      }
      
      alert("Failed to save settings: " + (error.response?.data?.message || error.message));
    }
  };

  // Retry function for error states
  const handleRetry = () => {
    setError("");
    fetchDashboardData();
  };

  // Check authentication status - simplified since we rely on cookies
  const checkAuthStatus = async () => {
    try {
      // Try to fetch shop profile to check if user is authenticated
      await getShopProfile();
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        return false;
      }
      // For other errors, assume user is authenticated but there's a different issue
      return true;
    }
  };

  // Placeholder stats if API hasn't loaded yet
  const placeholderStats = {
    appointments_today: 5,
    total_sales: 1250,
    total_customers: 42,
    products: 16
  };

  // Placeholder appointments
  const placeholderAppointments = [
    { id: 1, customer_name: "John Doe", service: "Haircut", time: "10:00 AM", status: "confirmed" },
    { id: 2, customer_name: "Jane Smith", service: "Beard Trim", time: "11:30 AM", status: "confirmed" },
    { id: 3, customer_name: "Mike Johnson", service: "Haircut & Styling", time: "2:15 PM", status: "pending" }
  ];

  // Placeholder notifications
  const placeholderNotifications = [
    { id: 1, message: "New appointment request from Alex Brown", time: "5 minutes ago", read: false },
    { id: 2, message: "Reminder: Order new supplies", time: "1 hour ago", read: false },
    { id: 3, message: "Payment received from Maria Garcia", time: "3 hours ago", read: true }
  ];

  // Use real data or placeholders
  const displayStats = stats || placeholderStats;
  const displayAppointments = recentAppointments.length > 0 ? recentAppointments : placeholderAppointments;
  const displayNotifications = notifications.length > 0 ? notifications : placeholderNotifications;
  const unreadNotifications = displayNotifications.filter(n => !n.read).length;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading shop dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !error.includes("expired")) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={() => navigate("/shop/login")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Approval pending notice component
  const ApprovalPendingNotice = () => (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <span className="font-medium">Your shop approval is pending.</span> Until your shop is approved, you can only access the Settings section.
          </p>
          <p className="mt-2 text-sm text-yellow-700">
            Please complete your profile information in Settings to help expedite the approval process.
          </p>
        </div>
      </div>
    </div>
  );

  // Locked content component for unapproved shops
  const LockedContent = () => (
    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow p-6">
      <div className="text-gray-400 text-5xl mb-4">
        <FaLock />
      </div>
      <h3 className="text-xl font-medium text-gray-700 mb-2">This section is locked</h3>
      <p className="text-gray-500 text-center max-w-md">
        This content is only available after your shop has been approved.
        Please complete your profile information in the Settings section.
      </p>
    </div>
  );

  // Settings content component




// Fixed SettingsContent component
const SettingsContent = () => {
  // Initialize formData with empty values first, then update when shopData is available
  const [formData, setFormData] = useState({
    shopName: '',
    email: '',
    phone: '',
    ownerName: '',
    address: '',
    description: ''
  });
  
  // Update formData when shopData changes
useEffect(() => {
  console.log("ShopData in SettingsContent:", shopData); // Debug log
  
  if (shopData) {
    const newFormData = {
      shopName: shopData.name || '',
      email: shopData.email || '',
      phone: shopData.phone || '',
      ownerName: shopData.owner_name || '',
      address: shopData.address || '',
      description: shopData.description || ''
    };
    
    console.log("Setting form data:", newFormData); // Debug log
    setFormData(newFormData);
  }
}, [shopData]);
  
  // Set up businessHours with default values
  const DAYS_OF_WEEK = [
    { id: 0, name: 'Monday' },
    { id: 1, name: 'Tuesday' },
    { id: 2, name: 'Wednesday' },
    { id: 3, name: 'Thursday' },
    { id: 4, name: 'Friday' },
    { id: 5, name: 'Saturday' },
    { id: 6, name: 'Sunday' },
  ];
  
  // Business hours and special days state
  const [businessHours, setBusinessHours] = useState(
    DAYS_OF_WEEK.map(day => ({
      day_of_week: day.id,
      day_name: day.name,
      opening_time: '09:00',
      closing_time: '17:00',
      is_closed: day.id === 6 // Sunday closed by default
    }))
  );
  const [specialClosingDays, setSpecialClosingDays] = useState([]);
  const [newClosingDay, setNewClosingDay] = useState({ date: '', reason: '' });
  
  // UI state for settings
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessDataLoading, setBusinessDataLoading] = useState(false);
  
  // Fetch business hours and special closing days
  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        setBusinessDataLoading(true);
        
        // Use the proper API functions instead of direct fetch
        const [hoursResponse, closingDaysResponse] = await Promise.allSettled([
          getBusinessHours(),
          getSpecialClosingDays()
        ]);
        
        if (hoursResponse.status === 'fulfilled' && hoursResponse.value.data.length > 0) {
          setBusinessHours(hoursResponse.value.data);
        }
        
        if (closingDaysResponse.status === 'fulfilled') {
          setSpecialClosingDays(closingDaysResponse.value.data);
        }
        
      } catch (error) {
        console.error("Error fetching business data:", error);
      } finally {
        setBusinessDataLoading(false);
      }
    };
    
    // Only fetch business data if shop is approved
    if (isApproved) {
      fetchBusinessData();
    }
  }, [isApproved]);
  
  // Handle input changes for shop details
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle business hours update
  const handleHoursChange = (index, field, value) => {
    const updatedHours = [...businessHours];
    
    if (field === 'is_closed') {
      updatedHours[index].is_closed = value;
    } else {
      updatedHours[index][field] = value;
    }
    
    setBusinessHours(updatedHours);
  };
  
  // Save shop details - Fixed to use formData
  const handleSaveShopDetails = async () => {
    setIsSubmitting(true);
    try {
      const updatedShopData = {
        name: formData.shopName,
        phone: formData.phone,
        owner_name: formData.ownerName,
        address: formData.address,
        description: formData.description
      };
      
      const response = await updateShopProfile(updatedShopData);
      const updatedData = response.data;
      
      setShopData(updatedData);
      
      // Check if approval status changed
      if (updatedData.is_approved !== isApproved) {
        setIsApproved(updatedData.is_approved);
        
        // If newly approved, refresh dashboard data
        if (updatedData.is_approved) {
          fetchDashboardData();
        }
      }
      
      alert("Shop details updated successfully!");
      
    } catch (error) {
      console.error("Error saving shop details:", error);
      alert("Failed to save shop details: " + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Save business hours - Use proper API function
  const handleSaveHours = async () => {
    setIsSubmitting(true);
    try {
      await updateBusinessHours(businessHours);
      alert("Business hours updated successfully!");
    } catch (error) {
      console.error("Error saving business hours:", error);
      alert("Failed to save business hours: " + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle new closing day input changes
  const handleClosingDayChange = (field, value) => {
    setNewClosingDay(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Add special closing day - Use proper API function
  const handleAddClosingDay = async () => {
    if (!newClosingDay.date) {
      alert("Please select a date");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await addSpecialClosingDay(newClosingDay);
      
      setSpecialClosingDays([
        ...specialClosingDays,
        {
          id: response.data.id,
          date: newClosingDay.date,
          reason: newClosingDay.reason
        }
      ]);
      setNewClosingDay({ date: '', reason: '' });
      alert("Special closing day added successfully!");
    } catch (error) {
      console.error("Error adding special closing day:", error);
      alert("Failed to add special closing day: " + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Remove special closing day - Use proper API function
  const handleRemoveClosingDay = async (id) => {
    setIsSubmitting(true);
    try {
      await removeSpecialClosingDay(id);
      setSpecialClosingDays(specialClosingDays.filter(day => day.id !== id));
      alert("Special closing day removed successfully!");
    } catch (error) {
      console.error("Error removing special closing day:", error);
      alert("Failed to remove special closing day: " + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Shop Details Section */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Shop Details</h3>
        
        {!isApproved && <ApprovalPendingNotice />}
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="shopName">Shop Name</label>
              <input 
                type="text" 
                id="shopName"
                name="shopName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.shopName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email"
                name="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                value={formData.email}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">Phone Number</label>
              <input 
                type="tel" 
                id="phone"
                name="phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ownerName">Owner Name</label>
              <input 
                type="text" 
                id="ownerName"
                name="ownerName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.ownerName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="address">Shop Address</label>
            <textarea 
              id="address"
              name="address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={formData.address}
              onChange={handleInputChange}
              required
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Shop Description</label>
            <textarea 
              id="description"
              name="description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              required
            ></textarea>
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={handleSaveShopDetails}
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
            >
              <div className="flex items-center">
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Shop Details'}
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Business Hours Section - Only show if approved */}
      {isApproved && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Business Hours</h3>
            <button 
              onClick={handleSaveHours}
              disabled={isSubmitting || businessDataLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
            >
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Hours'}
              </div>
            </button>
          </div>
          
          {businessDataLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {businessHours.map((day, index) => (
                <div 
                  key={day.day_of_week} 
                  className="grid grid-cols-12 gap-4 items-center py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div className="col-span-3 font-medium">{day.day_name}</div>
                  
                  <div className="col-span-8 grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="time"
                        value={day.opening_time || '09:00'}
                        onChange={(e) => handleHoursChange(index, 'opening_time', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled={day.is_closed}
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="time"
                        value={day.closing_time || '17:00'}
                        onChange={(e) => handleHoursChange(index, 'closing_time', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled={day.is_closed}
                      />
                    </div>
                  </div>
                  
                  <div className="col-span-1 flex items-center justify-end">
                    <input
                      type="checkbox"
                      id={`closed-${day.day_of_week}`}
                      checked={day.is_closed}
                      onChange={(e) => handleHoursChange(index, 'is_closed', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`closed-${day.day_of_week}`} className="ml-2 text-sm text-gray-700">
                      Closed
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Special Closing Days Section - Only show if approved */}
      {isApproved && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Special Closing Days</h3>
          
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="closingDate">
                Date
              </label>
              <input
                type="date"
                id="closingDate"
                value={newClosingDay.date}
                onChange={(e) => handleClosingDayChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="closingReason">
                Reason (Optional)
              </label>
              <input
                type="text"
                id="closingReason"
                value={newClosingDay.reason}
                onChange={(e) => handleClosingDayChange('reason', e.target.value)}
                placeholder="e.g., Holiday, Maintenance"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <button
                onClick={handleAddClosingDay}
                disabled={isSubmitting || !newClosingDay.date}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
              >
                <div className="flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Adding...' : 'Add Closing Day'}
                </div>
              </button>
            </div>
          </div>
          
          {specialClosingDays.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {specialClosingDays.map((day) => (
                    <tr key={day.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {day.reason || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemoveClosingDay(day.id)}
                          disabled={isSubmitting}
                          className="text-red-600 hover:text-red-900 disabled:text-red-300"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No special closing days added yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
  // Dashboard content component
  const DashboardContent = () => (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{displayStats.appointments_today}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <FaCalendarCheck />
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => navigateToSection("appointments")}
              className="text-sm text-blue-600 hover:underline"
            >
              View all appointments
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Sales</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">${displayStats.total_sales}</h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <FaMoneyBillWave />
            </div>
          </div>
          <div className="mt-4">
            <button className="text-sm text-blue-600 hover:underline">View sales history</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Customers</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{displayStats.total_customers}</h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-full text-purple-600">
              <FaUserFriends />
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => navigateToSection("customers")}
              className="text-sm text-blue-600 hover:underline"
            >
              View customers
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Services</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{displayStats.products}</h3>
            </div>
            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <FaShoppingBag />
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => navigateToSection("services")}
              className="text-sm text-blue-600 hover:underline"
            >
              Manage services
            </button>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="py-4 px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Recent Appointments</h3>
            <button 
              onClick={() => navigateToSection("appointments")}
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 px-2">Customer</th>
                  <th className="pb-3 px-2">Service</th>
                  <th className="pb-3 px-2">Time</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="py-3 px-2">
                      <div className="font-medium text-gray-900">{appointment.customer_name}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{appointment.service}</td>
                    <td className="py-3 px-2 text-gray-700">{appointment.time}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        appointment.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : appointment.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <FaClipboardList />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800">
                          <FaTimes />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notifications */}
        <div className="bg-white rounded-lg shadow">
          <div className="py-4 px-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
          </div>
          <div className="p-4">
            <ul className="divide-y divide-gray-200">
              {displayNotifications.map((notification) => (
                <li key={notification.id} className={`py-3 px-2 ${!notification.read ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start">
                    <div className={`p-2 rounded-full ${!notification.read ? 'bg-blue-200 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                      <FaBell className="text-sm" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm ${!notification.read ? 'font-medium' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            {displayNotifications.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <p>No notifications at this time</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="py-4 px-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button 
                className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition duration-200"
                onClick={() => navigateToSection("appointments")}
              >
                <div className="p-3 bg-blue-100 rounded-full text-blue-600 mb-2">
                  <FaCalendarAlt />
                </div>
                <span className="text-sm font-medium">Add Appointment</span>
              </button>
              
              <button 
                className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition duration-200"
                onClick={() => navigateToSection("customers")}
              >
                <div className="p-3 bg-green-100 rounded-full text-green-600 mb-2">
                  <FaUsers />
                </div>
                <span className="text-sm font-medium">Add Customer</span>
              </button>
              
              <button 
                className="flex flex-col items-center justify-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition duration-200"
                onClick={() => navigateToSection("services")}
              >
                <div className="p-3 bg-amber-100 rounded-full text-amber-600 mb-2">
                  <FaShoppingBag />
                </div>
                <span className="text-sm font-medium">Add Service</span>
              </button>
              
              <button className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition duration-200">
                <div className="p-3 bg-purple-100 rounded-full text-purple-600 mb-2">
                  <FaChartLine />
                </div>
                <span className="text-sm font-medium">View Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Appointments content component
  const AppointmentsContent = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointments</h3>
      <p className="text-gray-600 mb-6">Manage your appointments here.</p>
      
      {/* Your appointments content will go here */}
      <div className="text-gray-500 text-center py-10">
        <p>Appointments management functionality coming soon</p>
      </div>
    </div>
  );
  
  // Services content component
  const ServicesContent = () => {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isEditingService, setIsEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: 30,
    is_active: true
  });

  // Fetch services from the API
  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("shop_access_token");
      if (!token) throw new Error("Not authenticated");
      
      const response = await fetch("http://127.0.0.1:8000/api/auth/shop/services/", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch services");
      
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load services on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration_minutes: 30,
      is_active: true
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Add new service
const handleAddService = async (e) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem("shop_access_token");
    if (!token) throw new Error("Not authenticated");
    
    // You'll need to get the shop_id from somewhere - either from local storage,
    // global state, or fetched from an API endpoint first
    const shop_id = localStorage.getItem("shop_id"); // Or however you store the shop ID
    if (!shop_id) throw new Error("Shop ID not found");
    
    const dataToSend = {
      ...formData,
      shop_id: shop_id
    };
    
    const response = await fetch("http://127.0.0.1:8000/api/auth/shop/services/create/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dataToSend)
    });
    
    if (!response.ok) throw new Error("Failed to create service");
    
    const newService = await response.json();
    setServices([...services, newService]);
    setIsAddingService(false);
    resetForm();
  } catch (error) {
    console.error("Error adding service:", error);
    setError(error.message);
  }
};


  // Update existing service
  const handleUpdateService = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("shop_access_token");
      if (!token) throw new Error("Not authenticated");
      
      const response = await fetch(`http://127.0.0.1:8000/api/auth/shop/services/${isEditingService}/update/`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error("Failed to update service");
      
      const updatedService = await response.json();
      setServices(services.map(service => 
        service.id === updatedService.id ? updatedService : service
      ));
      setIsEditingService(null);
      resetForm();
    } catch (error) {
      console.error("Error updating service:", error);
      setError(error.message);
    }
  };

  // Delete service
  const handleDeleteService = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    
    try {
      const token = localStorage.getItem("shop_access_token");
      if (!token) throw new Error("Not authenticated");
      
      const response = await fetch(`http://127.0.0.1:8000/api/auth/shop/services/${id}/delete/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Failed to delete service");
      
      setServices(services.filter(service => service.id !== id));
    } catch (error) {
      console.error("Error deleting service:", error);
      setError(error.message);
    }
  };

  // Start editing a service
  const startEditService = (service) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration_minutes: service.duration_minutes,
      is_active: service.is_active
    });
    setIsEditingService(service.id);
  };

  // Cancel form
  const handleCancel = () => {
    setIsAddingService(false);
    setIsEditingService(null);
    resetForm();
  };

  // Display loading state
  if (isLoading && services.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Services</h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Services</h3>
          {!isAddingService && !isEditingService && (
            <button 
              onClick={() => setIsAddingService(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
            >
              <div className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAddingService || isEditingService) && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-md font-medium text-gray-700 mb-4">
            {isAddingService ? 'Add New Service' : 'Edit Service'}
          </h4>
          
          <form onSubmit={isAddingService ? handleAddService : handleUpdateService}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input 
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input 
                  type="number"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleInputChange}
                  min="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="flex items-center h-full pt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active (available for booking)
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="flex items-center">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </div>
              </button>
              
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  {isAddingService ? 'Save Service' : 'Update Service'}
                </div>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services List */}
      <div className="p-6">
        {services.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{service.name}</div>
                      {service.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{service.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${Number(service.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.duration_minutes} mins
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        service.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button 
                          onClick={() => startEditService(service)}
                          className="text-blue-600 hover:text-blue-900"
                          disabled={isAddingService || isEditingService}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={isAddingService || isEditingService}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {!isAddingService && !error && (
              <div>
                <p className="mb-4">No services have been added yet.</p>
                <button 
                  onClick={() => setIsAddingService(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
                >
                  <div className="flex items-center justify-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Service
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


  
  // Customers content component
const CustomersContent = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Customers</h3>
      <p className="text-gray-600 mb-6">Manage your customer database here.</p>
      
      {/* Your customers content will go here */}
      <div className="text-gray-500 text-center py-10">
        <p>Customer management functionality coming soon</p>
      </div>
    </div>
  );
  
  // Analytics content component
  const AnalyticsContent = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Analytics</h3>
      <p className="text-gray-600 mb-6">View your shop's performance metrics here.</p>
      
      {/* Your analytics content will go here */}
      <div className="text-gray-500 text-center py-10">
        <p>Analytics functionality coming soon</p>
      </div>
    </div>
  );

  // Rendering content based on selected section and approval status
  const renderContent = () => {
    // If not approved, render settings or locked content
    if (!isApproved && currentSection !== "settings") {
      return <LockedContent />;
    }
    
    // Otherwise render the selected section content
    switch(currentSection) {
      case "dashboard":
        return <DashboardContent />;
      case "appointments":
        return <AppointmentsContent />;
      case "services":
        return <ServicesContent />;
      case "customers":
        return <CustomersContent />;
      case "analytics":
        return <AnalyticsContent />;
      case "settings":
        return <SettingsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Mobile Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-20">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md bg-blue-600 text-white"
        >
          {sidebarOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {currentSection === "dashboard" && "Dashboard Overview"}
              {currentSection === "appointments" && "Appointments"}
              {currentSection === "services" && "Services"}
              {currentSection === "customers" && "Customers"}
              {currentSection === "analytics" && "Analytics"}
              {currentSection === "settings" && "Settings"}
            </h2>
            
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

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Display warning for unapproved shops */}
          {!isApproved && currentSection === "settings" && <ApprovalPendingNotice />}
          
          {/* Render the appropriate content */}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}