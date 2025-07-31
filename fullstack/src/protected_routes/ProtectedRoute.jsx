// Enhanced Protected Route Components with Role-Based Access Control
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { lazy, Suspense, useState, useEffect } from "react"

// Utility function to get user data and role
// Enhanced Protected Route Components with Role-Based Access Control

// Utility function to get user data and role
const getUserData = () => {
  try {
    const userData = localStorage.getItem("user_data");
    const shopData = localStorage.getItem("shop_data");
    
    // Check if shop_data exists first (shops have both shop_data and user_data)
    if (shopData) {
      const shop = JSON.parse(shopData);
      return {
        type: 'shop',
        data: shop,
        isAuthenticated: true
      };
    }
    
    if (userData) {
      const user = JSON.parse(userData);
      // Check if this user_data is for a shop (has role: "shop")
      if (user.role === 'shop') {
        return {
          type: 'shop',
          data: user,
          isAuthenticated: true
        };
      }
      // Check if this is an admin user
      else if (user.superuser || user.role === 'admin') {
        return {
          type: 'admin',
          data: user,
          isAuthenticated: true
        };
      }
      // Regular user
      else {
        return {
          type: 'user',
          data: user,
          isAuthenticated: true
        };
      }
    }
    
    return {
      type: null,
      data: null,
      isAuthenticated: false
    };
  } catch (error) {
    console.error("Error parsing user data:", error);
    localStorage.removeItem("user_data");
    localStorage.removeItem("shop_data");
    return {
      type: null,
      data: null,
      isAuthenticated: false
    };
  }
};

// Enhanced User Route Protection
const ProtectedUserRoute = ({ children }) => {
  const { type, isAuthenticated } = getUserData();
  
  console.log("ProtectedUserRoute - User type:", type, "Authenticated:", isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If user is admin or shop, redirect them to their respective dashboards
  if (type === 'admin') {
    console.log("Admin user trying to access user routes, redirecting to admin dashboard");
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  if (type === 'shop') {
    console.log("Shop user trying to access user routes, redirecting to shop dashboard");
    return <Navigate to="/shop/dashboard" replace />;
  }
  
  // Only allow regular users
  if (type !== 'user') {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Enhanced Admin Route Protection
const ProtectedAdminRoute = ({ children }) => {
  const { type, data, isAuthenticated } = getUserData();
  
  console.log("ProtectedAdminRoute - User type:", type, "Authenticated:", isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // If user or shop tries to access admin routes, redirect them
  if (type === 'user') {
    console.log("Regular user trying to access admin routes, redirecting to user home");
    return <Navigate to="/home" replace />;
  }
  
  if (type === 'shop') {
    console.log("Shop user trying to access admin routes, redirecting to shop dashboard");
    return <Navigate to="/shop/dashboard" replace />;
  }
  
  // Only allow admin users
  if (type !== 'admin' || !data?.superuser) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

// Enhanced Shop Route Protection
const ProtectedShopRoute = ({ children }) => {
  const { type, isAuthenticated } = getUserData();
  
  console.log("ProtectedShopRoute - User type:", type, "Authenticated:", isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/shop/login" replace />;
  }
  
  // If user or admin tries to access shop routes, redirect them
  if (type === 'user') {
    console.log("Regular user trying to access shop routes, redirecting to user home");
    return <Navigate to="/home" replace />;
  }
  
  if (type === 'admin') {
    console.log("Admin user trying to access shop routes, redirecting to admin dashboard");
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  // Only allow shop users
  if (type !== 'shop') {
    return <Navigate to="/shop/login" replace />;
  }
  
  return children;
};

// Fixed Route Guard Component - More precise path checking
const RouteGuard = () => {
  const location = useLocation();
  const { type, isAuthenticated } = getUserData();
  
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const currentPath = location.pathname;
    
    // More precise path checking to avoid blocking legitimate user routes
    if (type === 'user') {
      // Block only actual admin and shop management routes, not shop detail viewing
      if (currentPath.startsWith('/admin/') || 
          (currentPath.startsWith('/shop/') && !currentPath.startsWith('/shop-details/'))) {
        console.log("User detected in wrong section, redirecting to home");
        window.location.replace('/home');
      }
    } else if (type === 'admin') {
      // Block shop management routes and user-specific routes
      if (currentPath.startsWith('/shop/') || 
          (currentPath.startsWith('/') && 
           !currentPath.startsWith('/admin/') && 
           currentPath !== '/' && 
           currentPath !== '/home')) {
        console.log("Admin detected in wrong section, redirecting to admin dashboard");
        window.location.replace('/admin/dashboard');
      }
    } else if (type === 'shop') {
      // Block admin routes and user-specific routes
      if (currentPath.startsWith('/admin/') || 
          (currentPath.startsWith('/') && 
           !currentPath.startsWith('/shop/') && 
           currentPath !== '/' && 
           currentPath !== '/home')) {
        console.log("Shop detected in wrong section, redirecting to shop dashboard");
        window.location.replace('/shop/dashboard');
      }
    }
  }, [location.pathname, type, isAuthenticated]);
  
  return null;
};

// Logout utility function
const handleLogout = () => {
  localStorage.removeItem("user_data");
  localStorage.removeItem("shop_data");
  // Clear any other auth-related data
  window.location.href = '/login';
};

// Export the components
export {
  ProtectedUserRoute,
  ProtectedAdminRoute,
  ProtectedShopRoute,
  RouteGuard,
  handleLogout,
  getUserData
};