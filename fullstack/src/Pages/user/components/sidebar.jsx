import { useNavigate, useLocation } from "react-router-dom"
import { Home, Users, Calendar, MessageSquare, Wallet, Settings, LogOut } from "lucide-react"

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get active item from current URL path
  const getActiveItemFromPath = () => {
    const path = location.pathname.substring(1) // Remove leading slash
    return path || "find-barbers"
  }

  const menuItems = [
    { id: "home", label: "Home", icon: Home, path: "/home" },
    // { id: "find-barbers", label: "Find Barbers", icon: Users, path: "/find-barbers" },
    { id: "bookings", label: "Bookings", icon: Calendar, path: "/bookings" },
    { id: "chats", label: "Chats", icon: MessageSquare, path: "/chats" },
    { id: "wallet", label: "Wallet", icon: Wallet, path: "/wallet" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ]

  // Function to handle logout with API call
  const handleLogout = async () => {
    try {
      // Call the logout API endpoint if you have one
      console.log("Logging out user...")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      // Clear localStorage and redirect to login
      try {
        localStorage.removeItem('user_data')
        localStorage.removeItem('isAuthenticated')
        console.log("Local storage cleared")
      } catch (storageError) {
        console.error("Error clearing localStorage:", storageError)
      }
      
      // Navigate to login page using React Router
      navigate("/login")
    }
  }

  // Handle menu item click with React Router navigation
  const handleMenuClick = (item) => {
    navigate(item.path)
  }

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center font-bold text-black mr-3">
            B&B
          </div>
          <div>
            <div className="font-semibold text-lg">BARBER</div>
            <div className="text-xs text-gray-400">JUST FOR YOU</div>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item)}
            className={`w-full flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${
              location.pathname === item.path ? "bg-amber-500 text-white" : ""
            }`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-700 p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  )
}