import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const ShopOtpVerification = () => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the shop email from state or localStorage
  const [shopEmail, setShopEmail] = useState('');
  
  useEffect(() => {
    // Add debugging to see what's happening during component mount
    console.log("OTP Page Mounted");
    console.log("Location state:", location.state);
    
    // Try all possible localStorage keys
    console.log("shop_email from localStorage:", localStorage.getItem('shop_email'));
    console.log("shop_registration_email from localStorage:", localStorage.getItem('shop_registration_email'));
    
    // Get shop email from location state if available
    if (location.state && location.state.email) {
      console.log("Email found in location state:", location.state.email);
      setShopEmail(location.state.email);
    } else {
      // Try both possible localStorage keys
      const storedEmail = localStorage.getItem('shop_email') || localStorage.getItem('shop_registration_email');
      
      if (storedEmail) {
        console.log("Email found in localStorage:", storedEmail);
        setShopEmail(storedEmail);
      } else {
        console.log("No email found, redirecting to registration");
        // No email found, redirect to registration
        navigate('/shop/register');
      }
    }
  }, [location, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');
    setSuccess('');
    
    try {
      console.log("Attempting to verify OTP for email:", shopEmail);
      
      // Ensure OTP is sent as a string to match backend expectations
      const otpString = String(otp).trim();
      
      // Call the API to verify OTP
      const response = await axios.post('http://localhost:8000/api/auth/verify-otp/', {
        email: shopEmail,
        otp: otpString
      });
      
      console.log('OTP verification response:', response.data);
      
      // Show success message
      setSuccess('OTP verified successfully! Redirecting to login...');
      
      // Store verification status if needed
      localStorage.removeItem('shop_email'); // Clean up both possible keys
      localStorage.removeItem('shop_registration_email');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/shop/login');
      }, 2000);
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      
      // Enhanced error handling
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        const errorMessage = error.response.data.detail || 
                            error.response.data.non_field_errors?.join(', ') || 
                            'Failed to verify OTP. Please try again.';
        setError(errorMessage);
        console.log('Error response data:', error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        setError('No response from server. Please check your connection and try again.');
      } else {
        // Something happened in setting up the request
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setSuccess('');
  
    try {
      console.log("Attempting to resend OTP for email:", shopEmail);
      
      const response = await axios.post('http://localhost:8000/api/auth/resend-otp/', {
        email: shopEmail
      });
  
      console.log('Resend OTP response:', response.data);
      setSuccess('OTP has been resent successfully.');
      // Clear any previous OTP input
      setOtp('');
    } catch (error) {
      console.error('Error resending OTP:', error);
      
      // Enhanced error handling for resend
      if (error.response) {
        const errorMessage = error.response.data.detail || 
                            error.response.data.non_field_errors?.join(', ') || 
                            'Failed to resend OTP. Please try again.';
        setError(errorMessage);
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full min-h-screen">
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
      
      {/* Right Section - White Background with OTP Form */}
      <div className="flex-1 bg-white flex justify-center items-center p-8">
        <div className="w-full max-w-md">
          {/* OTP Heading */}
          <h1 className="text-3xl font-bold mb-6 text-center">Shop Verification</h1>
          <p className="text-gray-600 mb-10 text-center">
            We've sent a verification code to<br />
            <span className="font-medium">{shopEmail || "your email"}</span>
          </p>
          
          {/* Success/Error Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 border-l-4 border-green-500 text-green-700">
              {success}
            </div>
          )}
          
          {/* OTP Form */}
          <form onSubmit={handleVerify} className="flex flex-col space-y-8">
            <div className="flex flex-col space-y-2">
              <label htmlFor="otp-input" className="text-gray-700">Verification Code</label>
              <input
                id="otp-input"
                type="text"
                placeholder="Enter your 6-digit verification code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                pattern="\d{6}"
                className="p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <small className="text-gray-500">Enter the 6-digit code sent to your email</small>
            </div>
            
            {/* Buttons */}
            <div className="flex space-x-4 mt-4">
              <button 
                type="submit" 
                className={`flex-1 py-3 bg-blue-600 text-white font-semibold rounded transition-colors 
                  ${isVerifying ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                disabled={isVerifying || otp.length !== 6}
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
              
              <button 
                type="button" 
                className={`flex-1 py-3 bg-transparent text-blue-600 font-semibold border border-blue-600 rounded transition-colors
                  ${isResending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-50'}`}
                onClick={handleResendOtp}
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShopOtpVerification;