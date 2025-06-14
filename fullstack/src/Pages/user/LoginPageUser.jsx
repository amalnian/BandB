import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import toast from "react-hot-toast" // Add this import
import { login, googleSignIn } from "@/endpoints/APIs"

// Google Sign-In Hook
const useGoogleSignIn = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Sign-In script
    const loadGoogleScript = () => {
      if (window.google) {
        console.log("Google API already loaded");
        initializeGoogleSignIn();
        return;
      }
      
      console.log("Loading Google Sign-In script");
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log("Google script loaded successfully");
        initializeGoogleSignIn();
      };
      script.onerror = (error) => {
        console.error("Failed to load Google script:", error);
        toast.error("Failed to load Google Sign-In"); // Add toast for script error
      };
      document.head.appendChild(script);
    };

    const initializeGoogleSignIn = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: '1016181249848-kn59ov7i80ep5gj5g7qc05ncfg4qpp1j.apps.googleusercontent.com',
          callback: handleGoogleCallback,
          auto_select: false,
        });
      }
    };

    const handleGoogleCallback = async (response) => {
      setIsGoogleLoading(true);
      
      try {
        console.log("Google Sign-In response received");
        toast.loading("Signing in with Google...", { id: "google-signin" }); // Loading toast
        
        // Send the credential to your backend
        const result = await googleSignIn(response.credential);
    
        const userInfo = result.data.data.user;
        
        const userData = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          role: userInfo.role || 'user',
          isGoogleUser: true,
        };

        localStorage.setItem("user_data", JSON.stringify(userData));
        
        console.log("Google user data stored:", userData);
        
        toast.success(`Welcome back, ${userData.name || userData.email}!`, { id: "google-signin" }); // Success toast
        
        // Navigate to home page
        navigate("/", { replace: true });
        
      } catch (error) {
        console.error("Google Sign-In failed:", error);
        
        const errorMessage = error.response?.data?.error || 'Google Sign-In failed';
        toast.error(errorMessage, { id: "google-signin" }); // Error toast
        
        // Return error to be handled by the parent component
        if (window.handleGoogleError) {
          window.handleGoogleError(errorMessage);
        }
      } finally {
        setIsGoogleLoading(false);
      }
    };

    loadGoogleScript();
  }, [navigate]);

  const renderGoogleButton = (onError) => {
    // Store error handler globally so the callback can access it
    window.handleGoogleError = onError;

    useEffect(() => {
      const renderButton = () => {
        if (window.google && window.google.accounts) {
          console.log("Google API loaded, rendering button");
          
          // Clear any existing button
          const existingButton = document.getElementById('google-signin-button');
          if (existingButton) {
            existingButton.innerHTML = '';
          }

          // Small delay to ensure DOM is ready
          setTimeout(() => {
            const buttonContainer = document.getElementById('google-signin-button');
            if (buttonContainer) {
              window.google.accounts.id.renderButton(
                buttonContainer,
                {
                  theme: 'outline',
                  size: 'large',
                  text: 'signin_with',
                  width: 400, // Use pixel value instead of percentage
                  logo_alignment: 'left'
                }
              );
            }
          }, 100);
        } else {
          console.log("Google API not yet loaded");
          // Retry after a short delay
          setTimeout(renderButton, 500);
        }
      };

      renderButton();
    }, []);

    return (
      <div className="relative">
        <div 
          id="google-signin-button" 
          className={`w-full min-h-[44px] flex justify-center ${isGoogleLoading ? 'opacity-50 pointer-events-none' : ''}`}
          style={{ minHeight: '44px' }}
        />
        {isGoogleLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-md">
            <div className="text-sm text-gray-600">Signing in with Google...</div>
          </div>
        )}
      </div>
    );
  };

  return { renderGoogleButton, isGoogleLoading };
};

export default function LoginPageUser() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { renderGoogleButton, isGoogleLoading } = useGoogleSignIn()

  // Check if user is already logged in on component mount
// Check if user is already logged in on component mount
useEffect(() => {
  const userData = localStorage.getItem("user_data")
  if (userData) {
    try {
      const user = JSON.parse(userData)
      // User is already logged in, redirect to home
      // Remove this line: toast.success(`Welcome back, ${user.name || user.email}!`)
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
      
      // Show loading toast
      toast.loading("Logging in...", { id: "login" })
      
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
        first_name: response.data?.user?.first_name,
        last_name: response.data?.user?.last_name,
        role: response.data?.user?.role || response.data?.role || 'user',
        isGoogleUser: false, // Flag to identify regular users
        // Add any other user fields your app needs
        // Note: tokens are stored in httpOnly cookies, not localStorage
      }

      // Store user data in localStorage so protected routes can access it
      localStorage.setItem("user_data", JSON.stringify(userData))
      
      console.log("User data stored:", userData)
      console.log("About to navigate to home page")
      
      // Show success toast
      toast.success(`Welcome back, ${userData.name || userData.email}!`, { id: "login" })
      
      // Navigate to home page
      navigate("/", { replace: true })
      
    } catch (error) {
      console.error("Error during login process:", error)
      
      let errorMessage = "Login failed. Please try again."
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response
        
        if (status === 401) {
          errorMessage = "Invalid email or password. Please try again."
        } else if (status === 403) {
          errorMessage = "Your account is not active. Please verify your email first."
        } else if (status === 422) {
          // Validation errors
          if (data?.detail) {
            if (Array.isArray(data.detail)) {
              errorMessage = data.detail.map(err => err.msg || err).join(", ")
            } else {
              errorMessage = data.detail
            }
          } else {
            errorMessage = "Please check your input and try again."
          }
        } else if (data?.detail) {
          errorMessage = data.detail
        } else if (data?.non_field_errors) {
          errorMessage = data.non_field_errors[0]
        } else if (data?.email) {
          errorMessage = data.email[0]
        } else if (data?.message) {
          errorMessage = data.message
        } else {
          errorMessage = "Login failed. Please check your credentials."
        }
      } else if (error.request) {
        // Network error
        errorMessage = "Network error. Please check your connection and try again."
      }
      
      // Show error toast
      toast.error(errorMessage, { id: "login" })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleError = (errorMessage) => {
    setError(errorMessage);
    // Toast is already shown in the Google callback
  };

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

          {/* Wrap inputs in a form element */}
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
                disabled={loading || isGoogleLoading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
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
                  disabled={loading || isGoogleLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={loading || isGoogleLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <Link
                  to="/forgot-password" 
                  className="text-sm text-blue-500 hover:text-blue-700 transition duration-200 block mt-1"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2 px-4 bg-yellow-400 hover:bg-yellow-500 text-white font-medium rounded-md transition duration-200 ${
                (loading || isGoogleLoading) ? "opacity-70 cursor-not-allowed" : ""
              }`}
              disabled={loading || isGoogleLoading}
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
              {renderGoogleButton(handleGoogleError)}
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