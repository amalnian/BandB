"use client"

import { useState } from "react"
import { Eye, EyeOff, ShieldAlert } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import toast, { Toaster } from "react-hot-toast"
import { login } from "@/endpoints/AdminAPI" // Adjust the import path based on your file structure

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
  
    // Show loading toast
    const loadingToast = toast.loading("Signing in...");
  
    try {
      // Use your admin API function
      const response = await login({ email, password });
      
      console.log("Login response:", response); // Debug log
      
      if (response.data.success) {
        // Store user data in localStorage including superuser flag
        const userData = {
          id: response.data.user?.id || response.data.id,
          email: response.data.user?.email || response.data.email || email,
          superuser: response.data.user?.superuser || response.data.superuser || true,
          name: response.data.user?.name || response.data.name,
          // Add any other user properties you receive from the API
        };
        
        console.log("Storing user data:", userData); // Debug log
        
        // Store the data synchronously
        localStorage.setItem("user_data", JSON.stringify(userData));
        
        // Verify data was stored immediately
        const storedData = localStorage.getItem("user_data");
        console.log("Verified stored data:", storedData); // Debug log
        
        if (storedData) {
          console.log("Navigating to admin dashboard..."); // Debug log
          
          // Dismiss loading toast and show success
          toast.dismiss(loadingToast);
          toast.success("Login successful! Redirecting...", {
            duration: 2000,
          });
          
          // Navigate after a short delay to show the success message
          setTimeout(() => {
            navigate("/admin/dashboard", { replace: true });
          }, 1000);
        } else {
          throw new Error("Failed to store user data");
        }
        
      } else {
        throw new Error(response.data.message || "Login failed");
      }
      
    } catch (error) {
      console.error("Login error:", error);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Handle different types of errors
      let errorMessage;
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || 
                      error.response.data?.detail || 
                      "Invalid credentials";
      } else if (error.request) {
        // Network error
        errorMessage = "Network error. Please check your connection.";
      } else {
        // Other errors
        errorMessage = error.message || "An unexpected error occurred";
      }
      
      // Show error toast
      toast.error(errorMessage, {
        duration: 4000,
      });
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Toast container */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Left side - Dark theme for admin */}
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
          <div className="text-center mb-6">
            <ShieldAlert className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Admin Login</h2>
            <p className="text-gray-600">Enter your credentials to access the admin dashboard</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="admin@example.com"
                required
                disabled={loading}
                autoComplete="email"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="••••••••"
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
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition duration-200 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Login to Admin Panel"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              to="/" 
              className="text-sm text-gray-600 hover:text-gray-800 transition duration-200"
            >
              ← Return to main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}