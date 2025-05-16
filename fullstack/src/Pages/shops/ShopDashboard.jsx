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

  // Token refresh function
  const refreshToken = async () => {
    console.log("Attempting to refresh token...");
    const refresh = localStorage.getItem("shop_refresh_token");
    if (!refresh) return false;
    
    try {
      const refreshResponse = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
      });
      
      if (refreshResponse.ok) {
        const tokens = await refreshResponse.json();
        localStorage.setItem("shop_access_token", tokens.access);
        console.log("Token refreshed successfully");
        return true;
      }
      console.log("Failed to refresh token, response:", refreshResponse.status);
      return false;
    } catch (error) {
      console.error("Refresh token error:", error);
      return false;
    }
  };

  // Fetch dashboard data with approval check
  const fetchDashboardData = async (shouldRefresh = false) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem("shop_access_token");
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      // First check if shop data exists in localStorage
      const storedShopData = localStorage.getItem("shop_data");
      if (storedShopData) {
        const parsedShopData = JSON.parse(storedShopData);
        setShopData(parsedShopData);
        
        // Set the approval status based on the shop data
        setIsApproved(parsedShopData.is_approved);
        
        // If not approved, automatically set the current section to settings
        if (!parsedShopData.is_approved) {
          setCurrentSection("settings");
        }
      } else {
        // If shop data is not in localStorage, fetch it
        const shopResponse = await fetch("http://127.0.0.1:8000/api/auth/shop/profile/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (shopResponse.ok) {
          const shopData = await shopResponse.json();
          setShopData(shopData);
          setIsApproved(shopData.is_approved);
          localStorage.setItem("shop_data", JSON.stringify(shopData));
          
          // If not approved, automatically set the current section to settings
          if (!shopData.is_approved) {
            setCurrentSection("settings");
          }
        } else if (shopResponse.status === 401 && !shouldRefresh) {
          // Handle 401 for shop profile
          const refreshSuccessful = await refreshToken();
          if (refreshSuccessful) {
            return fetchDashboardData(true);
          } else {
            throw new Error("Session expired. Please log in again.");
          }
        }
      }
      
      // Only fetch other dashboard data if the shop is approved
      if (isApproved) {
        // Fetch shop dashboard stats
        const response = await fetch("http://127.0.0.1:8000/api/auth/dashboard/stats/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // Get detailed error information
          let errorData;
          try {
            errorData = await response.json();
            console.error("Error details:", errorData);
          } catch (e) {
            console.error("Could not parse error response");
          }

          if (response.status === 401 && !shouldRefresh) {
            console.log("Received 401, attempting token refresh");
            const refreshSuccessful = await refreshToken();
            if (refreshSuccessful) {
              console.log("Retrying fetch after token refresh");
              return fetchDashboardData(true); // Retry with refreshed token
            } else {
              localStorage.removeItem("shop_access_token");
              localStorage.removeItem("shop_refresh_token");
              localStorage.removeItem("shop_data");
              throw new Error("Session expired. Please log in again.");
            }
          }
          throw new Error(`Failed to fetch shop data: ${errorData?.error || response.statusText}`);
        }

        const data = await response.json();
        setStats(data);
        
        // Similar pattern for appointments and notifications
        const appointmentsResponse = await fetch("http://127.0.0.1:8000/api/auth/appointments/recent/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json();
          setRecentAppointments(appointmentsData);
        } else if (appointmentsResponse.status === 401 && !shouldRefresh) {
          // This might already be handled by the previous refresh
        }
        
        // Fetch notifications with similar pattern
        const notificationsResponse = await fetch("http://127.0.0.1:8000/api/auth/notifications/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (notificationsResponse.ok) {
          const notificationsData = await notificationsResponse.json();
          setNotifications(notificationsData);
        }
      }
      
    } catch (error) {
      console.error("Error:", error.message);
      setError(error.message);
      
      // Redirect to login if not authenticated
      if (error.message === "Not authenticated" || error.message.includes("expired")) {
        navigate("/shop/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // This second effect ensures that currentSection is properly set after isApproved value is loaded
    if (!isApproved && currentSection !== "settings") {
      setCurrentSection("settings");
    }
  }, [isApproved, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("shop_access_token");
    localStorage.removeItem("shop_refresh_token");
    localStorage.removeItem("shop_data");
    navigate("/shop/login");
  };

  // Navigate to different sections - strict access control
  const navigateToSection = (section) => {
    // If shop is not approved, only allow access to settings
    if (!isApproved && section !== "settings") {
      // Show a notification or alert here if you want
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
      const token = localStorage.getItem("shop_access_token");
      if (!token) throw new Error("Not authenticated");
      
      const response = await fetch("http://127.0.0.1:8000/api/auth/shop/update/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedShopData)
      });
      
      if (response.ok) {
        const updatedData = await response.json();
        setShopData(updatedData);
        localStorage.setItem("shop_data", JSON.stringify(updatedData));
        
        // Check if approval status changed
        if (updatedData.is_approved !== isApproved) {
          setIsApproved(updatedData.is_approved);
        }
        
        // Show success message
        alert("Settings updated successfully!");
      } else {
        throw new Error("Failed to update shop settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings: " + error.message);
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
  const SettingsContent = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Shop Settings</h3>
      
      {!isApproved && <ApprovalPendingNotice />}
      
      <form className="space-y-6" onSubmit={handleSaveSettings}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="shopName">Shop Name</label>
            <input 
              type="text" 
              id="shopName"
              name="shopName"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue={shopData?.name || ""}
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
              defaultValue={shopData?.email || ""}
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
              defaultValue={shopData?.phone || ""}
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
              defaultValue={shopData?.owner_name || ""}
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
            rows="3"
            defaultValue={shopData?.address || ""}
            required
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Shop Description</label>
          <textarea 
            id="description"
            name="description"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows="4"
            defaultValue={shopData?.description || ""}
            required
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="openingHours">Opening Hours</label>
          <input 
            type="text" 
            id="openingHours"
            name="openingHours"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Mon-Fri: 9am-7pm, Sat: 10am-5pm"
            defaultValue={shopData?.opening_hours || ""}
            required
          />
        </div>
        
        <div className="flex justify-end">
          <button 
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );

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
  const ServicesContent = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Services</h3>
      <p className="text-gray-600 mb-6">Manage your services and products here.</p>
      
      {/* Your services content will go here */}
      <div className="text-gray-500 text-center py-10">
        <p>Services management functionality coming soon</p>
      </div>
    </div>
  );
  
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