"use client"

import { useState } from "react"
import { Home, Users, Calendar, MessageSquare, Wallet, Settings, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom" // Import useNavigate for redirection
import { logout } from "@/endpoints/APIs" // Adjust the import path as needed


export default function Sidebar() {
  const [activeItem, setActiveItem] = useState("find-barbers")
  const navigate = useNavigate() // Initialize navigate function for redirection
  
  const menuItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "find-barbers", label: "Find Barbers", icon: Users },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "chats", label: "Chats", icon: MessageSquare },
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  // Function to handle logout with API call
  const handleLogout = async () => {
    try {
      // Call the logout API endpoint
      const response = await logout()
      
      // Check if logout was successful
      if (response?.success) {
        console.log("User logged out successfully")
      } else {
        console.log("Logout API returned non-success response")
      }
    } catch (error) {
      console.error("Logout error:", error)
      
      // If we get a 401, it means the user is already "logged out" from the server's perspective
      if (error.response?.status === 401) {
        console.log("User already logged out on server side (401)")
      } else {
        console.log("Logout API call failed, proceeding with client-side logout")
      }
    } finally {
      // Always clear client-side state and redirect, regardless of API response
      try {
        localStorage.removeItem('user_data')
        localStorage.removeItem('isAuthenticated')
        localStorage.clear() // Clear all localStorage items as a fallback
        console.log("Local storage cleared")
      } catch (storageError) {
        console.error("Error clearing localStorage:", storageError)
      }
      
      console.log("Redirecting to login page...")
      navigate("/login")
    }
  }

  return (
    <aside className="bg-gray-900 text-white w-64 hidden md:flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <a href="/" className="flex items-center">
          <h1 className="text-2xl font-bold">B&B</h1>
        </a>
        <p className="text-xs text-gray-400 mt-1">BARBER JUST FOR YOU</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul>
          {menuItems.map((item) => (
            <li key={item.id}>
              <a
                href="#"
                className={`flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white ${
                  activeItem === item.id ? "bg-amber-500 text-white" : ""
                }`}
                onClick={(e) => {
                  e.preventDefault()
                  setActiveItem(item.id)
                }}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout - Now with API call */}
      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}