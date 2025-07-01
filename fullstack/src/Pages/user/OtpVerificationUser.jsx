import React, { useState, useEffect } from 'react';

const OtpVerification = () => {
  const [otp, setOtp] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Extract email from URL params with improved debugging
  useEffect(() => {
    // Get email from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    
    console.log('Email from URL:', emailFromUrl);
    
    if (emailFromUrl) {
      setUserEmail(decodeURIComponent(emailFromUrl));
      console.log('Email set successfully:', decodeURIComponent(emailFromUrl));
    } else {
      console.log('No email found in URL parameters');
      setError('Email address not found. Please return to registration page.');
    }
  }, []);

  // Toast component
  const Toast = ({ show, message, onClose }) => {
    useEffect(() => {
      if (show) {
        const timer = setTimeout(() => {
          onClose();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [show, onClose]);

    if (!show) return null;

    return (
      <div className="fixed top-4 right-4 z-50 animate-slide-in">
        <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-medium">{message}</span>
          <button 
            onClick={onClose}
            className="ml-2 text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

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
      
      // Make actual API call to verify OTP
      const response = await fetch('http://localhost:8000/api/verify-otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          otp: otp
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('OTP verification successful:', data);
        
        // Show success toast
        setShowToast(true);
        
        // Add a delay to show the success toast before redirecting
        setTimeout(() => {
          // If verification successful, redirect to login page
          window.location.href = '/login';
        }, 2000);
      } else {
        // Handle errors from backend
        if (data.email) {
          setError(`Email error: ${data.email}`);
        } else if (data.error) {
          setError(data.error);
        } else if (data.detail) {
          setError(data.detail);
        } else {
          setError('Failed to verify OTP. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError('Network error. Please check your connection.');
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
      
      const response = await fetch('http://localhost:8000/api/resend-otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('OTP resend response:', data);
        // Show success message
        alert('A new verification code has been sent to your email.');
      } else {
        if (data.error) {
          setError(data.error);
        } else {
          setError('Failed to resend OTP. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsResending(false);
    }
  };

  // Function to go back to registration page
  const handleGoBack = () => {
    window.location.href = '/signup';
  };

  return (
    <>
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
      
      {/* Toast Notification */}
      <Toast 
        show={showToast} 
        message="Account created successfully!" 
        onClose={() => setShowToast(false)}
      />

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
              <div className="flex flex-col space-y-6">
                {/* Add explicit email field (hidden) */}
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
                    disabled={isVerifying}
                  />
                </div>
                
                {/* Buttons */}
                <div className="flex space-x-4 mt-4">
                  <button 
                    type="button"
                    onClick={handleVerify}
                    className={`flex-1 py-3 bg-amber-500 text-white font-semibold rounded transition-colors flex items-center justify-center gap-2
                      ${isVerifying ? 'opacity-70 cursor-not-allowed' : 'hover:bg-amber-600'}`}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </button>
                  
                  <button 
                    type="button" 
                    className={`flex-1 py-3 bg-transparent text-amber-500 font-semibold border border-amber-500 rounded transition-colors flex items-center justify-center gap-2
                      ${isResending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-amber-50'}`}
                    onClick={handleResendOtp}
                    disabled={isResending}
                  >
                    {isResending ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
                        Sending...
                      </>
                    ) : (
                      'Resend OTP'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OtpVerification;