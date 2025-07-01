"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

const SignupPage = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate form
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match")
      return
    }

    if (!formData.agreeTerms) {
      alert("Please agree to the terms and conditions")
      return
    }

    setIsLoading(true)

    // Here you would typically send the data to your Django backend
    try {
      // Example fetch request to your Django API
      const response = await fetch("http://127.0.0.1:8000/api/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          re_password: formData.password,
          role: "user", // or "shop" based on context
        }),
      })
      

      const data = await response.json()

      if (response.ok) {
        // Store email in memory for OTP verification
        console.log('Registration successful, email:', formData.email);
        
        // Add a small delay to show the loading state
        setTimeout(() => {
          // Redirect to OTP verification page with email as URL parameter
          window.location.href = `/otp?email=${encodeURIComponent(formData.email)}`
        }, 1000) // 1 second delay to show loading
      } else {
        // Handle errors from backend
        alert(data.message || "Registration failed")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("An error occurred during registration")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full">
      {/* Left Panel */}
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

      {/* Right Panel */}
      <div className="flex flex-1 items-center justify-center bg-white p-6 md:p-10">
        <div className="w-full max-w-lg">
          <h1 className="mb-10 text-3xl font-bold text-gray-800">Create your account</h1>

          <div onSubmit={handleSubmit}>
            {/* First Name & Last Name */}
            <div className="mb-6 flex flex-col gap-6 md:flex-row">
              <div className="flex-1">
                <label htmlFor="firstName" className="mb-2 block text-sm text-gray-600">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="First name..."
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="lastName" className="mb-2 block text-sm text-gray-600">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  placeholder="Last name..."
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Username */}
            <div className="mb-6">
              <label htmlFor="username" className="mb-2 block text-sm text-gray-600">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="Username..."
                value={formData.username}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
              />
            </div>

            {/* Email */}
            <div className="mb-6">
              <label htmlFor="email" className="mb-2 block text-sm text-gray-600">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
              />
            </div>

            {/* Password & Confirm Password */}
            <div className="mb-6 flex flex-col gap-6 md:flex-row">
              <div className="relative flex-1">
                <label htmlFor="password" className="mb-2 block text-sm text-gray-600">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Create password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 disabled:opacity-50"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="relative flex-1">
                <label htmlFor="confirmPassword" className="mb-2 block text-sm text-gray-600">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 disabled:opacity-50"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="mb-6 flex items-center gap-3">
              <input
                type="checkbox"
                id="agreeTerms"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="h-5 w-5 cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="agreeTerms" className="text-sm text-gray-600">
                I Agree with all of your{" "}
                <a href="/terms" className="text-amber-500 hover:underline">
                  Terms & Conditions
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="mt-2 w-full rounded-md bg-amber-400 py-3.5 text-base font-semibold text-white transition-colors hover:bg-amber-500 focus:outline-none disabled:bg-amber-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>

            {/* Social Sign-up */}
            <div className="mt-8 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignupPage