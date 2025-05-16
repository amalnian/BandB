"use client"

import { useState } from "react"
import { Search, Bell, Menu } from "lucide-react"

// Custom Avatar component to replace shadcn/ui
const Avatar = ({ children, src, alt }) => (
  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
    {src ? (
      <img src={src || "/placeholder.svg"} alt={alt} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-gray-700 font-medium">{children}</div>
    )}
  </div>
)

// Custom Button component to replace shadcn/ui
const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  }

  const sizeClasses = {
    default: "h-10 py-2 px-4",
    icon: "h-10 w-10",
  }

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// Custom Input component to replace shadcn/ui
const Input = ({ className = "", ...props }) => (
  <input
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
)

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between">
      {/* Mobile menu button */}
      <div className="md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white p-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="p-4 flex justify-end">
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="text-white text-xl">&times;</span>
                </button>
              </div>
              {/* Sidebar content */}
              <div className="p-0">{/* We would include the Sidebar component here */}</div>
            </div>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="relative flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="search"
            placeholder="Search"
            className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* User profile */}
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="mr-2">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>

        <div className="flex items-center ml-4">
          <div className="mr-4 text-right hidden sm:block">
            <p className="text-sm font-medium">Hi, Guest User</p>
            <p className="text-xs text-gray-500">California, US</p>
          </div>
          <Avatar src="https://via.placeholder.com/40" alt="User">
            U
          </Avatar>
        </div>
      </div>
    </header>
  )
}
