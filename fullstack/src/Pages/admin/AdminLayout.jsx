import { useState, useEffect } from "react"
import { useNavigate, Link, Outlet } from "react-router-dom"
import { 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu, 
  Home, 
  Scissors, 
  ShoppingBag 
} from "lucide-react"
import { getDashboardStats, logout } from "@/endpoints/AdminAPI"

export default function AdminLayout() {
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    console.log("AdminLayout mounted - checking authentication");
    
    // Check if user is logged in and is admin
    const checkAuthStatus = async () => {
      // First check localStorage for user data
      const storedUserData = localStorage.getItem("user_data");
      
      if (!storedUserData) {
        console.log("No user data in localStorage, redirecting to login");
        navigate("/admin/login");
        return;
      }
      
      try {
        const parsedUserData = JSON.parse(storedUserData);
        console.log("Found user data:", parsedUserData);
        
        // Verify the user is still authenticated by making an API call
        // This will use your axios interceptor with HTTP-only cookies
        await getDashboardStats();
        
        console.log("Authentication verified, setting user data");
        setUserData(parsedUserData);
      } catch (error) {
        console.error("Authentication verification failed:", error);
        // Clear invalid user data and redirect
        localStorage.removeItem("user_data");
        navigate("/admin/login");
      } finally {
        setLoading(false);
      }
    }
    
    checkAuthStatus()
  }, [navigate])
  
  const handleLogout = async () => {
    try {
      // Call logout API to clear HTTP-only cookies
      await logout();
    } catch (error) {
      console.error("Logout API error:", error);
      // Continue with logout even if API fails
    } finally {
      // Clear localStorage and redirect
      localStorage.removeItem("user_data");
      navigate("/admin/login");
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-gray-900 text-white ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col`}>
        {/* Logo area */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {sidebarOpen && <h1 className="text-xl font-bold">Admin</h1>}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-800"
          >
            <Menu size={20} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <Link to="/admin/dashboard" className="flex items-center p-2 rounded-md hover:bg-gray-800">
                <Home size={20} />
                {sidebarOpen && <span className="ml-3">Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link to="/admin/users" className="flex items-center p-2 rounded-md hover:bg-gray-800">
                <Users size={20} />
                {sidebarOpen && <span className="ml-3">Users</span>}
              </Link>
            </li>
            <li>
              <Link to="/admin/shops" className="flex items-center p-2 rounded-md hover:bg-gray-800">
                <Calendar size={20} />
                {sidebarOpen && <span className="ml-3">Shops</span>}
              </Link>
            </li>
            {/* <li>
              <Link to="/admin/requests" className="flex items-center p-2 rounded-md hover:bg-gray-800">
                <Scissors size={20} />
                {sidebarOpen && <span className="ml-3">Requests</span>}
              </Link>
            </li>
            <li>
              <Link to="/admin/products" className="flex items-center p-2 rounded-md hover:bg-gray-800">
                <ShoppingBag size={20} />
                {sidebarOpen && <span className="ml-3">Products</span>}
              </Link>
            </li> */}
            <li>
              <Link to="/admin/payments" className="flex items-center p-2 rounded-md hover:bg-gray-800">
                <Scissors size={20} />
                {sidebarOpen && <span className="ml-3">Payments</span>}
              </Link>
            </li>
            <li>
              <Link to="/admin/settings" className="flex items-center p-2 rounded-md hover:bg-gray-800">
                <Settings size={20} />
                {sidebarOpen && <span className="ml-3">Settings</span>}
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* User info and Logout */}
        <div className="p-4 border-t border-gray-800">
          {sidebarOpen && userData && (
            <div className="mb-2 text-sm text-gray-300">
              <p>Welcome, {userData.email}</p>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center p-2 w-full rounded-md hover:bg-gray-800"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </div>
      
      {/* Main content - renders the child route components */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}