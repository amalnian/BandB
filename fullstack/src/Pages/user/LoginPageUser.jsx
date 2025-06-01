import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { login } from "@/endpoints/APIs" // Adjust the import path as needed

export default function LoginPageUser() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Check if user is already logged in on component mount
  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (userData) {
      try {
        JSON.parse(userData)
        // User is already logged in, redirect to home
        navigate("/", { replace: true })
      } catch (error) {
        // Invalid data, clear it
        localStorage.removeItem("user_data")
      }
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
  
    try {
      console.log("Attempting login with:", { email, password: "***" })
      
      const formBody = {
        email,
        password
      }
      
      // Use the axios login function
      const response = await login(formBody)
      
      console.log("Login successful:", response)

      // IMPORTANT: Store user data in localStorage for your protected routes to work
      // Extract user data from the response - adjust this based on your API response structure
      const userData = {
        id: response.data?.user?.id || response.data?.id,
        email: response.data?.user?.email || response.data?.email || email,
        name: response.data?.user?.name || response.data?.name,
        role: response.data?.user?.role || response.data?.role || 'user',
        // Add any other user fields your app needs
        token: response.data?.access_token || response.data?.token,
        refreshToken: response.data?.refresh_token,
      }

      // Store user data in localStorage so protected routes can access it
      localStorage.setItem("user_data", JSON.stringify(userData))
      
      console.log("User data stored:", userData)
      console.log("About to navigate to home page")
      
      // Navigate to home page
      navigate("/", { replace: true })
      
    } catch (error) {
      console.error("Error during login process:", error)
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response
        
        if (status === 401) {
          setError("Invalid email or password. Please try again.")
        } else if (status === 403) {
          setError("Your account is not active. Please verify your email first.")
        } else if (status === 422) {
          // Validation errors
          if (data?.detail) {
            if (Array.isArray(data.detail)) {
              setError(data.detail.map(err => err.msg || err).join(", "))
            } else {
              setError(data.detail)
            }
          } else {
            setError("Please check your input and try again.")
          }
        } else if (data?.detail) {
          setError(data.detail)
        } else if (data?.non_field_errors) {
          setError(data.non_field_errors[0])
        } else if (data?.email) {
          setError(data.email[0])
        } else if (data?.message) {
          setError(data.message)
        } else {
          setError("Login failed. Please check your credentials.")
        }
      } else if (error.request) {
        // Network error
        setError("Network error. Please check your connection and try again.")
      } else {
        // Other error
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="Email address"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                {/* <Link 
                  to="/forgot-password" 
                  className="text-sm text-blue-500 hover:text-blue-700 transition duration-200"
                >
                  Forgot Password?
                </Link> */}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                                <Link 
                  to="/forgot-password" 
                  className="text-sm text-blue-500 hover:text-blue-700 transition duration-200"
                >
                  Forgot Password?
                </Link>
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
                className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition duration-200"
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
            <Link to="/signup" className="text-blue-500 hover:text-blue-700 transition duration-200">
              Signup
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}