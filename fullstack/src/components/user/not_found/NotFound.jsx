import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUserData } from '@/protected_routes/ProtectedRoute'; // Adjust path as needed

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { type, isAuthenticated } = getUserData();

  // Determine appropriate redirect based on user type
  const getHomeLink = () => {
    if (!isAuthenticated) return '/login';
    
    switch (type) {
      case 'admin':
        return '/admin/dashboard';
      case 'shop':
        return '/shop/dashboard';
      case 'user':
        return '/home';
      default:
        return '/login';
    }
  };

  const handleGoHome = () => {
    navigate(getHomeLink());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* 404 Animation */}
        <div className="mb-8">
          <div className="text-6xl font-bold text-indigo-600 mb-4 animate-bounce">
            404
          </div>
          <div className="w-24 h-1 bg-indigo-600 mx-auto mb-4 rounded"></div>
        </div>
        
        {/* Error Message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        
        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleGoHome}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition duration-300 ease-in-out"
          >
            Go Back
          </button>
        </div>
        
        {/* Additional Links */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Quick Links:</p>
          <div className="flex justify-center space-x-4 text-sm">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="text-indigo-600 hover:text-indigo-800">
                  Login
                </Link>
                <Link to="/signup" className="text-indigo-600 hover:text-indigo-800">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                {type === 'user' && (
                  <Link to="/home" className="text-indigo-600 hover:text-indigo-800">
                    Home
                  </Link>
                )}
                {type === 'shop' && (
                  <Link to="/shop/dashboard" className="text-indigo-600 hover:text-indigo-800">
                    Dashboard
                  </Link>
                )}
                {type === 'admin' && (
                  <Link to="/admin/dashboard" className="text-indigo-600 hover:text-indigo-800">
                    Admin Panel
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;