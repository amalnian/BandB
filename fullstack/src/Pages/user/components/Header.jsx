import { useState, useEffect } from "react"
import { Search, Bell, Menu, X } from "lucide-react"
import { 
  getUserProfile 
} from "@/endpoints/APIs"

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

export default function Header({ onSearch, searchQuery, onClearSearch }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || "")

  useEffect(() => {
    fetchUserProfile()
  }, [])

  useEffect(() => {
    setLocalSearchQuery(searchQuery || "")
  }, [searchQuery])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await getUserProfile()
      
      if (response.data && response.data.success) {
        setUserProfile(response.data.data)
      } else {
        // Fallback to localStorage if API fails
        const userData = localStorage.getItem("user_data")
        if (userData) {
          setUserProfile(JSON.parse(userData))
        }
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
      
      // Fallback to localStorage if API fails
      const userData = localStorage.getItem("user_data")
      if (userData) {
        try {
          setUserProfile(JSON.parse(userData))
        } catch (parseError) {
          console.error("Failed to parse user data from localStorage:", parseError)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value
    setLocalSearchQuery(value)
    
    // Debounce search - trigger search after user stops typing for 300ms
    if (onSearch) {
      clearTimeout(window.searchTimeout)
      window.searchTimeout = setTimeout(() => {
        onSearch(value.trim())
      }, 300)
    }
  }

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(localSearchQuery.trim())
    }
  }

  // Handle clear search
  const handleClearSearch = () => {
    setLocalSearchQuery("")
    if (onClearSearch) {
      onClearSearch()
    } else if (onSearch) {
      onSearch("")
    }
  }

  // Get user display name
  const getUserDisplayName = () => {
    if (!userProfile) return "Guest User"
    
    if (userProfile.name) return userProfile.name
    if (userProfile.first_name && userProfile.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`
    }
    if (userProfile.first_name) return userProfile.first_name
    if (userProfile.email) return userProfile.email
    
    return "Guest User"
  }

  // Get user avatar initials
  const getUserInitials = () => {
    if (!userProfile) return "GU"
    
    if (userProfile.name) {
      const names = userProfile.name.split(' ')
      return names.length > 1 
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0].substring(0, 2).toUpperCase()
    }
    
    if (userProfile.first_name && userProfile.last_name) {
      return `${userProfile.first_name[0]}${userProfile.last_name[0]}`.toUpperCase()
    }
    
    if (userProfile.first_name) {
      return userProfile.first_name.substring(0, 2).toUpperCase()
    }
    
    if (userProfile.email) {
      return userProfile.email.substring(0, 2).toUpperCase()
    }
    
    return "GU"
  }

  // Get user location
  const getUserLocation = () => {
    if (!userProfile) return "Location not set"
    
    // Check if the API response has location fields
    if (userProfile.city && userProfile.state) {
      return `${userProfile.city}, ${userProfile.state}`
    }
    if (userProfile.city && userProfile.country) {
      return `${userProfile.city}, ${userProfile.country}`
    }
    if (userProfile.location) {
      return userProfile.location
    }
    if (userProfile.address) {
      return userProfile.address
    }
    
    return "Location not set"
  }

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
            placeholder="Search shops by name..."
            value={localSearchQuery}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearchSubmit(e)
              }
            }}
            className="pl-10 pr-10 py-2 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          {localSearchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Search results indicator */}
        {localSearchQuery && (
          <div className="absolute top-full left-0 right-0 bg-white border border-t-0 border-gray-200 rounded-b-md shadow-sm px-3 py-2 text-sm text-gray-600 z-10">
            Searching for: <span className="font-medium text-amber-600">"{localSearchQuery}"</span>
          </div>
        )}
      </div>

      {/* User profile */}
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="mr-2">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>

        <div className="flex items-center ml-4">
          {loading ? (
            <div className="mr-4 text-right hidden sm:block">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-1 w-24"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
            </div>
          ) : (
            <div className="mr-4 text-right hidden sm:block">
              <p className="text-sm font-medium">Hi, {getUserDisplayName()}</p>
              <p className="text-xs text-gray-500">{getUserLocation()}</p>
            </div>
          )}
          
          <Avatar 
            src={userProfile?.profile_picture || userProfile?.avatar} 
            alt={getUserDisplayName()}
          >
            {getUserInitials()}
          </Avatar>
        </div>
      </div>
    </header>
  )
}