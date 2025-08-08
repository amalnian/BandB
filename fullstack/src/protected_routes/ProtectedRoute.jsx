// Enhanced Protected Route Components without Redux
import { Navigate, useLocation } from "react-router-dom"
import { useEffect, useState, useCallback } from "react"

// Utility function to read user data from localStorage synchronously
// Fixed Utility function to read user data from localStorage synchronously
const getUserDataFromStorage = () => {
  try {
    const storedUser = localStorage.getItem("user_data");
    const storedShop = localStorage.getItem("shop_data");
    
    if (storedUser) {
      const user = JSON.parse(storedUser);
      
      // Check if user is admin based on superuser property
      if (user.superuser === true) {
        return {
          type: 'admin',
          data: user,
          isAuthenticated: true
        };
      } 
      // Check if user has shop role
      else if (user.role === 'shop') {
        return {
          type: 'shop',
          data: user,
          isAuthenticated: true
        };
      } 
      else {
        // Regular user
        return {
          type: 'user',
          data: user,
          isAuthenticated: true
        };
      }
    } else if (storedShop) {
      const shop = JSON.parse(storedShop);
      return {
        type: 'shop',
        data: shop,
        isAuthenticated: true
      };
    }
  } catch (error) {
    console.error("Error parsing stored data:", error);
    localStorage.removeItem("user_data");
    localStorage.removeItem("shop_data");
  }
  
  return {
    type: null,
    data: null,
    isAuthenticated: false
  };
};

// Enhanced hook with better state management
const useUserData = () => {
  // Initialize with synchronous read
  const [userData, setUserData] = useState(() => getUserDataFromStorage());
  const [isLoading, setIsLoading] = useState(false);
  
  // Function to refresh user data
  const refreshUserData = useCallback(() => {
    const newUserData = getUserDataFromStorage();
    setUserData(newUserData);
    return newUserData;
  }, []);
  
  useEffect(() => {
    // Listen for storage changes (in case of logout from another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'user_data' || e.key === 'shop_data' || e.key === null) {
        refreshUserData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshUserData]);

  return { ...userData, isLoading, refreshUserData };
};

// Enhanced User Route Protection
const ProtectedUserRoute = ({ children }) => {
  const { type, isAuthenticated, isLoading } = useUserData();
  
  console.log("ProtectedUserRoute - User type:", type, "Authenticated:", isAuthenticated, "Loading:", isLoading);
  
  // Show loading if still checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
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
  const { type, data, isAuthenticated, isLoading } = useUserData();
  
  console.log("ProtectedAdminRoute - User type:", type, "Authenticated:", isAuthenticated, "Loading:", isLoading);
  
  // Show loading if still checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
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
  if (type !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

// Enhanced Shop Route Protection
const ProtectedShopRoute = ({ children }) => {
  const { type, isAuthenticated, isLoading } = useUserData();
  
  console.log("ProtectedShopRoute - User type:", type, "Authenticated:", isAuthenticated, "Loading:", isLoading);
  
  // Show loading if still checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
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

// Fixed Route Guard Component
const RouteGuard = () => {
  const location = useLocation();
  const { type, isAuthenticated } = useUserData();
  
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const currentPath = location.pathname;
    
    if (type === 'user') {
      if (currentPath.startsWith('/admin/') || 
          (currentPath.startsWith('/shop/') && !currentPath.startsWith('/shop-details/'))) {
        console.log("User detected in wrong section, redirecting to home");
        window.location.replace('/home');
      }
    } else if (type === 'admin') {
      if (currentPath.startsWith('/shop/') || 
          (currentPath.startsWith('/') && 
           !currentPath.startsWith('/admin/') && 
           currentPath !== '/' && 
           currentPath !== '/home')) {
        console.log("Admin detected in wrong section, redirecting to admin dashboard");
        window.location.replace('/admin/dashboard');
      }
    } else if (type === 'shop') {
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

// Updated logout utility function that clears localStorage
const handleLogout = () => {
  try {
    // Clear all user-related localStorage data
    localStorage.removeItem("user_data");
    localStorage.removeItem("shop_data");
    
    // Optional: Clear all localStorage if needed
    // localStorage.clear();
    
    // Redirect to login
    window.location.href = '/login';
  } catch (error) {
    console.error("Error during logout:", error);
    // Force redirect even if there's an error
    window.location.href = '/login';
  }
};

// Hook for logout functionality
const useLogout = () => {
  return () => handleLogout();
};

// Export the components and hooks
export {
  ProtectedUserRoute,
  ProtectedAdminRoute,
  ProtectedShopRoute,
  RouteGuard,
  handleLogout,
  useLogout,
  useUserData
};