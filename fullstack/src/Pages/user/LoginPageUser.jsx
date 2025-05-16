import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

export default function LoginPageUser() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const navigate = useNavigate()

  // Debug navigation
  useEffect(() => {
    if (navigating) {
      console.log("Navigation to dashboard triggered")
      // Add a small delay to ensure React Router has time to process
      const timer = setTimeout(() => {
        console.log("Checking if navigation succeeded")
        if (window.location.pathname !== "/dashboard") {
          console.log("Navigation may have failed. Current path:", window.location.pathname)
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [navigating])

  // Check if token exists on load (for debugging)
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      console.log("Access token found in localStorage")
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
  
    try {
      console.log("Attempting login with:", { email, password: "***" })
      
      // First check if user is active
      const checkResponse = await fetch(`http://127.0.0.1:8000/debug/user-status/?email=${encodeURIComponent(email)}`)
      if (!checkResponse.ok) {
        console.error("Failed to check user status:", await checkResponse.text())
        // Continue with login attempt even if status check fails
      } else {
        const userData = await checkResponse.json()
        console.log("User status:", userData)
        
        if (!userData.is_active) {
          setError("Your account is not active. Please verify your email first.")
          setLoading(false)
          return
        }
      }
      
      // Proceed with login
      const response = await fetch("http://127.0.0.1:8000/api/auth/jwt/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })
  
      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          console.error("Login error:", errorData)
          
          if (errorData.email && errorData.email[0].includes("not active")) {
            setError("Your account is not active. Please check your email for verification instructions.")
          } else if (errorData.detail) {
            setError(errorData.detail)
          } else {
            setError("Login failed. Please check your credentials.")
          }
        } else {
          const errorText = await response.text()
          console.error("Non-JSON error response:", errorText)
          setError("Login failed. Server error occurred.")
        }
        throw new Error("Login failed")
      }
  
      const data = await response.json()
      console.log("Login successful, tokens received:", {
        access: data.access ? `${data.access.substring(0, 10)}...` : "missing",
        refresh: data.refresh ? `${data.refresh.substring(0, 10)}...` : "missing"
      })
  
      // Store tokens - including as user_token which is what your ProtectedUserRoute looks for
      localStorage.setItem("access_token", data.access)
      localStorage.setItem("refresh_token", data.refresh)
      localStorage.setItem("user_token", data.access) // Add this for ProtectedUserRoute
      
      // Set authentication flag
      localStorage.setItem("isAuthenticated", "true")
      
      console.log("About to navigate to home page")
      // Set navigating flag for debug useEffect
      setNavigating(true)
      
      // Attempt navigation to home page (root path)
      navigate("/")
      
      // Fallback navigation if React Router fails
      setTimeout(() => {
        if (window.location.pathname !== "/") {
          console.log("Fallback: direct navigation to home page")
          window.location.href = "/"
        }
      }, 1000)
    } catch (error) {
      console.error("Error during login process:", error)
      if (!error) {
        setError("Login failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Left side - Orange background with barber theme */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-amber-400">
        <div className="absolute left-10 top-10 z-10 text-2xl font-bold text-gray-600 md:text-3xl">
          {/* BARBER AND THE BLADE */}
        </div>
        <div
          className="absolute h-full w-full bg-cover bg-center opacity-90"
          style={{
            backgroundImage: `url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-05-03%20201623-hWBuQJu4Woe1EGNtOJKek2UHCHrgrd.png')`,
            backgroundPosition: "left center",
          }}
        ></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%25%27 height=%27100%25%27 opacity=%270.15%27%3E%3Cpattern id=%27pattern%27 width=%2770%27 height=%2770%27 patternUnits=%27userSpaceOnUse%27%3E%3Cpath d=%27M0 10 L20 10 L20 0 L30 0 L30 10 L40 10 L40 0 L50 0 L50 10 L70 10 L70 20 L50 20 L50 30 L70 30 L70 40 L50 40 L50 50 L70 50 L70 60 L50 60 L50 70 L40 70 L40 60 L30 60 L30 70 L20 70 L20 60 L0 60 L0 50 L20 50 L20 40 L0 40 L0 30 L20 30 L20 20 L0 20 Z%27 fill=%27%23000%27/%3E%3C/pattern%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27url(%23pattern)%27/%3E%3C/svg%3E')]"></div>
      </div>

      {/* Right side - Login form */}
      <div className="bg-white md:w-1/2 p-6 flex items-center justify-center">
        <div className="w-full max-w-md p-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Welcome Back!</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Email address"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10"
                  placeholder="Password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2 px-4 bg-yellow-400 hover:bg-yellow-500 text-white font-medium rounded-md transition duration-200 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login Now"}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">SIGN IN WITH</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Google
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link to="/signup" className="text-blue-500 hover:text-blue-700">
              Signup
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}