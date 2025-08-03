import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaStore, FaLocationArrow, FaMapMarkerAlt, FaEdit } from 'react-icons/fa';

export default function ShopRegisterPage() {
  // State for form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    description: '',
    ownerName: '',
    latitude: null,
    longitude: null
  });
  
  // UI control states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  // Location states
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationObtained, setLocationObtained] = useState(false);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  
  const navigate = useNavigate();

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError("");
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      setLocationLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prevData => ({
          ...prevData,
          latitude: latitude,
          longitude: longitude
        }));
        setLocationObtained(true);
        setLocationLoading(false);
        setLocationError("");
        setShowManualLocation(false);
        
        // Optionally, get address from coordinates
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        let errorMessage = "";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
          default:
            errorMessage = "An unknown error occurred while retrieving location";
        }
        setLocationError(errorMessage);
        setLocationLoading(false);
      },
      options
    );
  }, []);

  // Handle manual location input
  const handleManualLocationSubmit = useCallback(() => {
    const lat = parseFloat(manualLatitude);
    const lng = parseFloat(manualLongitude);
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      setLocationError("Please enter valid latitude and longitude values");
      return;
    }
    
    if (lat < -90 || lat > 90) {
      setLocationError("Latitude must be between -90 and 90");
      return;
    }
    
    if (lng < -180 || lng > 180) {
      setLocationError("Longitude must be between -180 and 180");
      return;
    }
    
    setFormData(prevData => ({
      ...prevData,
      latitude: lat,
      longitude: lng
    }));
    setLocationObtained(true);
    setLocationError("");
    setShowManualLocation(false);
    
    // Optionally, get address from coordinates
    reverseGeocode(lat, lng);
  }, [manualLatitude, manualLongitude]);

  // Toggle manual location input
  const toggleManualLocation = useCallback(() => {
    setShowManualLocation(!showManualLocation);
    setLocationError("");
    if (!showManualLocation && locationObtained) {
      setManualLatitude(formData.latitude?.toString() || '');
      setManualLongitude(formData.longitude?.toString() || '');
    }
  }, [showManualLocation, locationObtained, formData.latitude, formData.longitude]);

  // Clear location data
  const clearLocation = useCallback(() => {
    setFormData(prevData => ({
      ...prevData,
      latitude: null,
      longitude: null
    }));
    setLocationObtained(false);
    setShowManualLocation(false);
    setManualLatitude('');
    setManualLongitude('');
    setLocationError("");
  }, []);

  // Reverse geocoding to get address from coordinates (optional)
  const reverseGeocode = async (lat, lng) => {
    try {
      // Using a free geocoding service (you can replace with your preferred service)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      
      if (data && data.locality) {
        // Auto-fill address if it's empty
        if (!formData.address) {
          setFormData(prevData => ({
            ...prevData,
            address: `${data.locality}, ${data.principalSubdivision}, ${data.countryName}`
          }));
        }
      }
    } catch (error) {
      console.log("Could not get address from coordinates:", error);
      // Silently fail - this is just a convenience feature
    }
  };

  // Prevent unnecessary re-renders
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  }, []);

  // Form validation for step 1
  const validateStep1 = useCallback(() => {
    if (!formData.name || !formData.email || !formData.phone) {
      setError("Please fill in all required fields");
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    
    // Basic phone validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      setError("Please enter a valid 10-digit phone number");
      return false;
    }
    
    return true;
  }, [formData]);
  
  // Form validation for step 2
  const validateStep2 = useCallback(() => {
    if (!formData.password || !formData.confirmPassword || !formData.address) {
      setError("Please fill in all required fields");
      return false;
    }
    
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    return true;
  }, [formData]);

  // Add the missing goToOtpPage function
  const goToOtpPage = useCallback(() => {
    navigate("/shop/otp", { 
      state: { email: formData.email } 
    });
  }, [navigate, formData.email]);

  // Memoized submit handler to prevent unnecessary re-renders
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) {
      return;
    }
    
    setError("");
    setIsLoading(true);

    try {
      const registrationData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        password: formData.password,
        description: formData.description || "",
        owner_name: formData.ownerName
      };

      // Add location data if available
      if (formData.latitude && formData.longitude) {
        registrationData.latitude = formData.latitude;
        registrationData.longitude = formData.longitude;
      }

      console.log("Submitting shop registration data:", registrationData);

      // Register the shop
const response = await fetch(`${import.meta.env.VITE_SHOP}/register/`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(registrationData),
});

      const data = await response.json();
      console.log("Registration response:", response.status, data);
      
      if (!response.ok) {
        // Check for specific error messages in the response
        if (data.email) {
          setError(`Email error: ${data.email}`);
        } else if (data.detail) {
          setError(data.detail);
        } else {
          setError("Failed to register shop. Please try again.");
        }
        setIsLoading(false);
        return;
      }
      
      // Store email in localStorage 
      localStorage.setItem("shop_email", formData.email);
      console.log("Shop email stored in localStorage:", formData.email);
      
      // Set registration success flag AFTER storing email
      setRegistrationSuccess(true);
      
    } catch (error) {
      console.error("Error during shop registration:", error);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }, [formData, validateStep2]);

  // Memoized navigation effect
  useEffect(() => {
    let timeoutId;
    if (registrationSuccess) {
      timeoutId = setTimeout(() => {
        console.log("Navigating to OTP page after successful registration");
        navigate("/shop/otp", { 
          state: { email: formData.email } 
        });
      }, 1000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [registrationSuccess, navigate, formData.email]);

  // Memoized step navigation
  const nextStep = useCallback(() => {
    if (validateStep1()) {
      setError("");
      setStep(2);
    }
  }, [validateStep1]);
  
  const prevStep = useCallback(() => {
    setError("");
    setStep(1);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left side - Image */}
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
      
      {/* Right side - Registration Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center overflow-y-auto py-6">
        <div className="max-w-md w-full px-6">
          <div className="text-center mb-6">
            <div className="inline-flex justify-center items-center p-4 bg-blue-100 rounded-full mb-4">
              <FaStore className="text-blue-600 text-3xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Shop Registration</h2>
            <p className="text-gray-600 mt-2">Create an account for your shop</p>
          </div>
          
          {/* Registration Success Message */}
          {registrationSuccess && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
              <p className="font-bold">Registration successful!</p>
              <p>We've sent a verification code to your email. Redirecting to verification page...</p>
              <button 
                onClick={goToOtpPage}
                className="mt-2 text-blue-600 hover:text-blue-800 font-semibold"
              >
                Click here if you're not redirected automatically
              </button>
            </div>
          )}
          
          {/* Progress indicator */}
          {!registrationSuccess && (
            <div className="flex items-center mb-8">
              <div className="flex items-center relative">
                <div className={`rounded-full transition duration-500 ease-in-out h-12 w-12 py-3 border-2 ${step === 1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-blue-600 border-blue-600 text-white'} flex items-center justify-center`}>
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="absolute top-0 -ml-10 text-center mt-16 w-32 text-xs font-medium text-blue-600">Shop Details</div>
              </div>
              <div className={`flex-auto border-t-2 transition duration-500 ease-in-out ${step === 2 ? 'border-blue-600' : 'border-gray-300'}`}></div>
              <div className="flex items-center relative">
                <div className={`rounded-full transition duration-500 ease-in-out h-12 w-12 py-3 border-2 ${step === 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-500'} flex items-center justify-center`}>
                  <span className={step === 2 ? 'text-white font-bold' : 'text-gray-500 font-bold'}>2</span>
                </div>
                <div className="absolute top-0 -ml-10 text-center mt-16 w-32 text-xs font-medium text-gray-500">Security</div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
              <p>{error}</p>
            </div>
          )}
          
          {!registrationSuccess && (
            <form onSubmit={handleSubmit}>
              {/* Step 1: Basic Shop Information */}
              {step === 1 && (
                <>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="name">
                      Shop Name*
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your Shop Name"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">
                      Email Address*
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="shop@example.com"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="phone">
                      Phone Number*
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1234567890"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="ownerName">
                      Owner's Name
                    </label>
                    <input
                      type="text"
                      id="ownerName"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="description">
                      Shop Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tell us about your shop"
                      rows="3"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
                  >
                    Continue
                  </button>
                </>
              )}
              
              {/* Step 2: Address and Security */}
              {step === 2 && (
                <>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="address">
                      Shop Address*
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Full shop address"
                      rows="2"
                      required
                    />
                  </div>

                  {/* Location Section */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Shop Location
                    </label>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      {!locationObtained ? (
                        <>
                          <p className="text-sm text-gray-600 mb-3">
                            Help customers find you by sharing your shop's location. This will improve your visibility in local searches.
                          </p>
                          
                          {!showManualLocation ? (
                            <div className="space-y-3">
                              <button
                                type="button"
                                onClick={getCurrentLocation}
                                disabled={locationLoading}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 transition duration-200 flex items-center justify-center"
                              >
                                {locationLoading ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Getting Location...
                                  </>
                                ) : (
                                  <>
                                    <FaLocationArrow className="mr-2" />
                                    Get Current Location
                                  </>
                                )}
                              </button>
                              
                              <div className="text-center">
                                <span className="text-gray-500 text-sm">or</span>
                              </div>
                              
                              <button
                                type="button"
                                onClick={toggleManualLocation}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition duration-200 flex items-center justify-center"
                              >
                                <FaEdit className="mr-2" />
                                Enter Location Manually
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-700">Manual Location Entry</h4>
                                <button
                                  type="button"
                                  onClick={toggleManualLocation}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  ✕
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Latitude*
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={manualLatitude}
                                    onChange={(e) => setManualLatitude(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 40.7128"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Longitude*
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={manualLongitude}
                                    onChange={(e) => setManualLongitude(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., -74.0060"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleManualLocationSubmit}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 transition duration-200"
                                >
                                  Set Location
                                </button>
                                <button
                                  type="button"
                                  onClick={toggleManualLocation}
                                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition duration-200"
                                >
                                  Cancel
                                </button>
                              </div>
                              
                              <p className="text-xs text-gray-500">
                                Tip: You can get coordinates from Google Maps by right-clicking on your location.
                              </p>
                            </div>
                          )}
                          
                          {locationError && (
                            <p className="text-red-500 text-sm mt-2">
                              {locationError}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="text-center">
                          <div className="flex items-center justify-center text-green-600 mb-2">
                            <FaMapMarkerAlt className="mr-2" />
                            <span className="font-semibold">Location Set!</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            Coordinates: {formData.latitude?.toFixed(6)}, {formData.longitude?.toFixed(6)}
                          </p>
                          <div className="flex gap-2 justify-center">
                            <button
                              type="button"
                              onClick={getCurrentLocation}
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                            >
                              Use Current Location
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                              type="button"
                              onClick={toggleManualLocation}
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                            >
                              Edit Manually
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                              type="button"
                              onClick={clearLocation}
                              className="text-red-600 hover:text-red-800 text-sm font-semibold"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Location sharing is optional but recommended for better customer reach.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
                      Password*
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Password must be at least 8 characters
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="confirmPassword">
                      Confirm Password*
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mb-6">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition duration-200"
                    >
                      Back
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Registering...
                        </>
                      ) : (
                        "Register Shop"
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
          
          {!registrationSuccess && (
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have a shop account?{" "}
                <Link to="/shop/login" className="text-blue-600 hover:text-blue-800 font-semibold">
                  Login
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}