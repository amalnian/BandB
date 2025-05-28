import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const OtpVerification = () => {
  const [otp, setOtp] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Extract email from URL params or state with improved debugging
  useEffect(() => {
    console.log('Location state:', location.state);
    
    // Try to get email from location state
    const stateEmail = location.state?.email;
    const searchParams = new URLSearchParams(location.search);
    const queryEmail = searchParams.get('email');
    const storedEmail = localStorage.getItem('registrationEmail');
    
    console.log('Email sources:', {
      stateEmail,
      queryEmail,
      storedEmail
    });
    
    // Priority: state > query param > localStorage
    if (stateEmail) {
      console.log('Using email from location state:', stateEmail);
      setUserEmail(stateEmail);
      // Save to localStorage as backup
      localStorage.setItem('registrationEmail', stateEmail);
    } else if (queryEmail) {
      console.log('Using email from URL query:', queryEmail);
      setUserEmail(queryEmail);
      localStorage.setItem('registrationEmail', queryEmail);
    } else if (storedEmail) {
      console.log('Using email from localStorage:', storedEmail);
      setUserEmail(storedEmail);
    } else {
      console.log('No email found in any source');
      setError('Email address not found. Please return to registration page.');
    }
  }, [location]);

  // Add validation before form submission
  const handleVerify = async (e) => {
    e.preventDefault();
    
    // Check if email exists before proceeding
    if (!userEmail || userEmail.trim() === '') {
      setError('Email address is missing. Please try registering again.');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    
    try {
      // Log the data being sent for debugging
      console.log('Sending verification request with:', { 
        email: userEmail,
        otp: otp
      });
      
      // Make actual API call to verify OTP with axios
      const response = await axios.post('http://localhost:8000/api/verify-otp/', {
        email: userEmail,
        otp: otp
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('OTP verification successful:', response.data);
      
      // Clear the email from localStorage once verified
      localStorage.removeItem('registrationEmail');
      
      // If verification successful, redirect to login page
      navigate('/login', { state: { verified: true, email: userEmail } });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      
      // More detailed error handling
      if (error.response) {
        console.log('Error response data:', error.response.data);
        // Handle specific error messages from backend
        if (error.response.data.email) {
          setError(`Email error: ${error.response.data.email}`);
        } else if (error.response.data.error) {
          setError(error.response.data.error);
        } else if (error.response.data.detail) {
          setError(error.response.data.detail);
        } else {
          setError('Failed to verify OTP. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!userEmail || userEmail.trim() === '') {
      setError('Email address is missing. Please try registering again.');
      return;
    }
    
    setIsResending(true);
    setError('');

    try {
      console.log('Resending OTP to:', userEmail);
      
      const response = await axios.post('http://localhost:8000/api/auth/resend-otp/', {
        email: userEmail,
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('OTP resend response:', response.data);
      // Show success message
      alert('A new verification code has been sent to your email.');
    } catch (error) {
      console.error('Error resending OTP:', error);
      
      // Detailed error handling
      if (error.response) {
        if (error.response.data.error) {
          setError(error.response.data.error);
        } else {
          setError('Failed to resend OTP. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setIsResending(false);
    }
  };

  // Function to go back to registration page
  const handleGoBack = () => {
    navigate('/signup');
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
          <h1 className="text-3xl font-bold mb-6 text-center">OTP Verification</h1>
          
          {/* Email display */}
          {userEmail ? (
            <p className="text-center mb-8 text-gray-600">
              We've sent a verification code to<br/>
              <span className="font-medium">{userEmail}</span>
            </p>
          ) : (
            <div className="text-center mb-8">
              <p className="text-gray-600 mb-4">
                Email address not found. Please return to registration.
              </p>
              <button
                onClick={handleGoBack}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors"
              >
                Back to Registration
              </button>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded border border-red-200">
              {error}
            </div>
          )}
          
          {/* OTP Form */}
          {userEmail && (
            <form onSubmit={handleVerify} className="flex flex-col space-y-6">
              {/* Add explicit email field (could be hidden or disabled but must be included) */}
              <input 
                type="hidden" 
                name="email" 
                value={userEmail || ''} 
              />
              
              <div className="flex flex-col space-y-2">
                <label htmlFor="otp-input" className="text-gray-700">Verification Code</label>
                <input
                  id="otp-input"
                  type="text"
                  placeholder="Enter your verification code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                  autoComplete="one-time-code"
                />
              </div>
              
              {/* Buttons */}
              <div className="flex space-x-4 mt-4">
                <button 
                  type="submit" 
                  className={`flex-1 py-3 bg-amber-500 text-white font-semibold rounded transition-colors 
                    ${isVerifying ? 'opacity-70 cursor-not-allowed' : 'hover:bg-amber-600'}`}
                  disabled={isVerifying}
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>
                
                <button 
                  type="button" 
                  className={`flex-1 py-3 bg-transparent text-amber-500 font-semibold border border-amber-500 rounded transition-colors
                    ${isResending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-amber-50'}`}
                  onClick={handleResendOtp}
                  disabled={isResending}
                >
                  {isResending ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;