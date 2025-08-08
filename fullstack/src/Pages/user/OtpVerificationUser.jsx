import React, { useState, useEffect } from 'react';
import toast, { Toaster } from "react-hot-toast";

const OtpVerification = () => {
  const [otp, setOtp] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');

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

  // FIXED: Use verify-otp endpoint instead of resend-otp
  const handleVerify = async (e) => {
    e.preventDefault();
    
    // Check if email exists before proceeding
    if (!userEmail || userEmail.trim() === '') {
      setError('Email address is missing. Please try registering again.');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    
    // Show loading toast
    const loadingToast = toast.loading("Verifying OTP...");
    
    try {
      // Log the data being sent for debugging
      console.log('Sending verification request with:', { 
        email: userEmail,
        otp: otp
      });
      
      // FIXED: Use the correct verify-otp endpoint
      const response = await fetch(`${import.meta.env.VITE_USER}verify-otp/`, {
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
        
        // Dismiss loading toast and show success
        toast.dismiss(loadingToast);
        toast.success("Account verified successfully! Redirecting to login...", {
          duration: 3000,
        });
        
        // Add a delay to show the success toast before redirecting
        setTimeout(() => {
          // If verification successful, redirect to login page
          window.location.href = '/login';
        }, 2000);
      } else {
        // Dismiss loading toast
        toast.dismiss(loadingToast);
        
        // Handle errors from backend
        let errorMessage;
        if (data.email) {
          errorMessage = `Email error: ${data.email}`;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else {
          errorMessage = 'Failed to verify OTP. Please try again.';
        }
        
        // Show error toast
        toast.error(errorMessage, {
          duration: 4000,
        });
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      const errorMessage = 'Network error. Please check your connection.';
      
      // Show error toast
      toast.error(errorMessage, {
        duration: 4000,
      });
      
      setError(errorMessage);
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

    // Show loading toast
    const loadingToast = toast.loading("Sending new OTP...");

    try {
      console.log('Resending OTP to:', userEmail);
      
      const response = await fetch(`${import.meta.env.VITE_USER}resend-otp/`, {
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
        
        // Dismiss loading toast and show success
        toast.dismiss(loadingToast);
        toast.success('A new verification code has been sent to your email!', {
          duration: 4000,
        });
        
        // Clear any previous errors
        setError('');
      } else {
        // Dismiss loading toast
        toast.dismiss(loadingToast);
        
        let errorMessage;
        if (data.error) {
          errorMessage = data.error;
        } else {
          errorMessage = 'Failed to resend OTP. Please try again.';
        }
        
        // Show error toast
        toast.error(errorMessage, {
          duration: 4000,
        });
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      const errorMessage = 'Network error. Please check your connection.';
      
      // Show error toast
      toast.error(errorMessage, {
        duration: 4000,
      });
      
      setError(errorMessage);
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
          loading: {
            iconTheme: {
              primary: '#f59e0b',
              secondary: '#fff',
            },
          },
        }}
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