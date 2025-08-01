import { useNavigate, useLocation } from "react-router-dom"
import { useDispatch } from "react-redux"
import { Home, Users, Calendar, MessageSquare, Wallet, Settings, LogOut } from "lucide-react"
import { logout } from '@/endpoints/APIs'
import { deleteUser } from '@/store/slices/UserSlice' // Adjust path as needed
import { persistor } from '@/store/store' // Adjust path as needed

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  
  // Get active item from current URL path
  const getActiveItemFromPath = () => {
    const path = location.pathname.substring(1) // Remove leading slash
    return path || "find-barbers"
  }

  const menuItems = [
    { id: "home", label: "Home", icon: Home, path: "/home" },
    // { id: "find-barbers", label: "Find Barbers", icon: Users, path: "/find-barbers" },
    { id: "bookings", label: "Bookings", icon: Calendar, path: "/bookings" },
    { id: "chats", label: "Chats", icon: MessageSquare, path: "/chat" },
    { id: "wallet", label: "Wallet", icon: Wallet, path: "/wallet" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ]

  // Updated function to handle logout with proper cleanup
  const handleLogout = async () => {
    try {
      // Call the logout API endpoint first
      console.log("Calling logout API...")
      await logout() // This calls your axios.post('logout/', {})
      console.log("Logout API call successful")
      
      // Clear Redux state
      console.log("Clearing Redux state...")
      dispatch(deleteUser())
      
      // Clear legacy localStorage data
      console.log("Clearing localStorage...")
      localStorage.removeItem('user_data')
      localStorage.removeItem('shop_data') // Clear shop data too if exists
      localStorage.removeItem('isAuthenticated')
      
      // Purge Redux Persist storage - This is the key part you were missing!
      console.log("Purging Redux Persist storage...")
      await persistor.purge()
      
      console.log("All cleanup completed successfully")
      
      // Navigate to login page
      navigate("/login", { replace: true })
      
    } catch (error) {
      console.error("Logout error:", error)
      
      // Even if API fails, we should still clean up local data for security
      // You can choose to comment this out if you want API call to be mandatory
      try {
        console.log("API failed, but cleaning up local data for security...")
        dispatch(deleteUser())
        localStorage.removeItem('user_data')
        localStorage.removeItem('shop_data')
        localStorage.removeType('isAuthenticated')
        await persistor.purge()
        navigate("/login", { replace: true })
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError)
        // Force navigation even if cleanup fails
        window.location.href = "/login"
      }
      
      // Optional: Show error message to user
      // You can add a toast notification here
      // toast.error("Logout failed, but you've been signed out locally")
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