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

export default function AdminLayout() {
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in and is admin
    const checkAuthStatus = async () => {
      const token = localStorage.getItem("access_token")
      
      if (!token) {
        navigate("/admin/login")
        return
      }
      
      try {
        // Check if user is admin
        const response = await fetch("http://127.0.0.1:8000/api/admin/check/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        
        if (!response.ok) {
          throw new Error("Not authorized")
        }
        
        const data = await response.json()
        setUserData(data)
      } catch (error) {
        console.error("Authentication error:", error)
        navigate("/admin/login")
      } finally {
        setLoading(false)
      }
    }
    
    checkAuthStatus()
  }, [navigate])
  
  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    navigate("/admin/login")
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
            <li>
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
            </li>
            <li>
              <Link to="/admin/settings" className="flex items-center p-2 rounded-md hover:bg-gray-800">
                <Settings size={20} />
                {sidebarOpen && <span className="ml-3">Settings</span>}
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
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