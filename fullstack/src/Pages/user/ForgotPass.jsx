import { useState } from "react"
import { Eye, EyeOff, ArrowLeft, Mail, Lock, Key } from "lucide-react"
import { forgotPassword, verifyForgotOtp, resetPassword } from "@/endpoints/APIs"

export default function ForgotPasswordFlow() {
  // Step management
  const [currentStep, setCurrentStep] = useState(1) // 1: Email, 2: OTP, 3: New Password, 4: Success
  
  // Form states
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Loading and error states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // OTP timer state
  const [otpTimer, setOtpTimer] = useState(0)
  const [canResendOtp, setCanResendOtp] = useState(false)

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    try {
      await forgotPassword(email)
      setCurrentStep(2)
      startOtpTimer()
    } catch (error) {
      console.error("Forgot password request failed:", error)
      
      if (error.response?.data?.email) {
        setError(error.response.data.email[0])
      } else if (error.response?.data?.error) {
        setError(error.response.data.error)
      } else {
        setError("Failed to send OTP. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    try {
      await verifyForgotOtp({ email, otp })
      setCurrentStep(3)
    } catch (error) {
      console.error("OTP verification failed:", error)
      
      if (error.response?.data?.error) {
        setError(error.response.data.error)
        if (error.response.data.error.includes("expired")) {
          setCanResendOtp(true)
          setOtpTimer(0)
        }
      } else {
        setError("Invalid OTP. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError("")
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }
    
    setLoading(true)
    
    try {
      await resetPassword({ 
        email, 
        otp, 
        new_password: newPassword 
      })
      setCurrentStep(4)
    } catch (error) {
      console.error("Password reset failed:", error)
      
      if (error.response?.data?.error) {
        setError(error.response.data.error)
      } else {
        setError("Failed to reset password. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    setError("")
    setLoading(true)
    setCanResendOtp(false)
    
    try {
      await forgotPassword(email)
      startOtpTimer()
      setError("")
    } catch (error) {
      setError("Failed to resend OTP. Please try again.")
      setCanResendOtp(true)
    } finally {
      setLoading(false)
    }
  }

  // OTP Timer
  const startOtpTimer = () => {
    setOtpTimer(60) // 60 seconds countdown
    const timer = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setCanResendOtp(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Reset to initial state
  const resetForm = () => {
    setCurrentStep(1)
    setEmail("")
    setOtp("")
    setNewPassword("")
    setConfirmPassword("")
    setError("")
    setOtpTimer(0)
    setCanResendOtp(false)
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

      {/* Right side - Form */}
      <div className="bg-white md:w-1/2 p-6 flex items-center justify-center">
        <div className="w-full max-w-md p-6">
          
          {/* Step 1: Request OTP */}
          {currentStep === 1 && (
            <>
              <div className="flex items-center mb-6">
                <button
                  onClick={() => window.history.back()}
                  className="mr-3 text-gray-600 hover:text-gray-800 transition duration-200"
                  disabled={loading}
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-3xl font-bold text-gray-800">Reset Password</h2>
              </div>

              <p className="text-gray-600 mb-6">
                Enter your email address and we'll send you a verification code to reset your password.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Enter your email address"
                    required
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRequestOtp(e)
                      }
                    }}
                  />
                </div>

                <button
                  onClick={handleRequestOtp}
                  className={`w-full py-2 px-4 bg-yellow-400 hover:bg-yellow-500 text-white font-medium rounded-md transition duration-200 ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Verification Code"}
                </button>
              </div>

              <div className="mt-6 text-center text-sm text-gray-500">
                Remember your password?{" "}
                <button 
                  onClick={() => window.history.back()}
                  className="text-blue-500 hover:text-blue-700 transition duration-200"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}

          {/* Step 2: Verify OTP */}
          {currentStep === 2 && (
            <>
              <div className="flex items-center mb-6">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="mr-3 text-gray-600 hover:text-gray-800 transition duration-200"
                  disabled={loading}
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-3xl font-bold text-gray-800">Enter Verification Code</h2>
              </div>

              <div className="text-center mb-6">
                <Key className="mx-auto mb-2 text-yellow-500" size={32} />
                <p className="text-gray-600">
                  We've sent a 6-digit verification code to
                </p>
                <p className="font-medium text-gray-800">{email}</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-center text-lg font-mono tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleVerifyOtp(e)
                      }
                    }}
                  />
                </div>

                <button
                  onClick={handleVerifyOtp}
                  className={`w-full py-2 px-4 bg-yellow-400 hover:bg-yellow-500 text-white font-medium rounded-md transition duration-200 ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </div>

              <div className="mt-6 text-center">
                {otpTimer > 0 ? (
                  <p className="text-sm text-gray-500">
                    Resend code in {otpTimer} seconds
                  </p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    className={`text-sm text-blue-500 hover:text-blue-700 transition duration-200 ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={loading || !canResendOtp}
                  >
                    Resend verification code
                  </button>
                )}
              </div>
            </>
          )}

          {/* Step 3: Reset Password */}
          {currentStep === 3 && (
            <>
              <div className="flex items-center mb-6">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="mr-3 text-gray-600 hover:text-gray-800 transition duration-200"
                  disabled={loading}
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-3xl font-bold text-gray-800">Create New Password</h2>
              </div>

              <p className="text-gray-600 mb-6">
                Please create a strong password for your account.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="Enter new password"
                      required
                      disabled={loading}
                      minLength={8}
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

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="Confirm new password"
                      required
                      disabled={loading}
                      minLength={8}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleResetPassword(e)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      disabled={loading}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleResetPassword}
                  className={`w-full py-2 px-4 bg-yellow-400 hover:bg-yellow-500 text-white font-medium rounded-md transition duration-200 ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Success */}
          {currentStep === 4 && (
            <>
              <div className="text-center">
                <div className="mb-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Lock className="text-green-600" size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Password Reset Successful!</h2>
                  <p className="text-gray-600">
                    Your password has been successfully reset. You can now login with your new password.
                  </p>
                </div>

                <button
                  onClick={() => window.location.href = "/login"}
                  className="w-full py-2 px-4 bg-yellow-400 hover:bg-yellow-500 text-white font-medium rounded-md transition duration-200"
                >
                  Back to Login
                </button>

                <button
                  onClick={resetForm}
                  className="w-full mt-3 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition duration-200"
                >
                  Reset Another Password
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}