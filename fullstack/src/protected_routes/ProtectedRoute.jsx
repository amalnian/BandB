// Enhanced Protected Route Components with Redux Integration
import { Navigate, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { deleteUser } from "../store/slices/UserSlice" // Adjust path as needed
import { persistor } from "../store/store" // Adjust path as needed

// Utility function to get user data from Redux store
const useUserData = () => {
  const user = useSelector((state) => state.user.user);
  
  if (!user) {
    return {
      type: null,
      data: null,
      isAuthenticated: false
    };
  }

  // Determine user type based on Redux store data
  if (user.superuser || user.role === 'admin') {
    return {
      type: 'admin',
      data: user,
      isAuthenticated: true
    };
  } else if (user.role === 'shop') {
    return {
      type: 'shop',
      data: user,
      isAuthenticated: true
    };
  } else {
    return {
      type: 'user',
      data: user,
      isAuthenticated: true
    };
  }
};

// Enhanced User Route Protection
const ProtectedUserRoute = ({ children }) => {
  const { type, isAuthenticated } = useUserData();
  
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
  const { type, data, isAuthenticated } = useUserData();
  
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
  const { type, isAuthenticated } = useUserData();
  
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

// Updated logout utility function that properly clears Redux Persist
const handleLogout = async (dispatch) => {
  try {
    // Clear Redux state
    dispatch(deleteUser());
    
    // Clear localStorage (legacy data)
    localStorage.removeItem("user_data");
    localStorage.removeItem("shop_data");
    
    // Purge Redux Persist storage
    await persistor.purge();
    
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
  const dispatch = useDispatch();
  
  return () => handleLogout(dispatch);
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