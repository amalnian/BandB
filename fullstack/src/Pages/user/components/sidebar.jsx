"use client"

import { useState } from "react"
import { Home, Users, Calendar, MessageSquare, Wallet, Settings, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom" // Import useNavigate for redirection

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

  // Function to handle logout
  const handleLogout = () => {
    // Clear all authentication tokens
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user_token")
    localStorage.removeItem("isAuthenticated")
    
    // Log the logout action
    console.log("User logged out successfully")
    
    // Redirect to login page
    navigate("/login")
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

      {/* Logout - Now with proper functionality */}
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