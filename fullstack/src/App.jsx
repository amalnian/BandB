"use client"

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { lazy, Suspense, useState, useEffect } from "react"
import axios from "axios"

// Create a loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin"></div>
  </div>
)

// Debug component to log current location
const LocationLogger = () => {
  const location = useLocation();
  useEffect(() => {
    console.log("Current route:", location.pathname);
  }, [location]);
  return null;
}

// Lazy load components
const LoginPage = lazy(() => import("./Pages/user/LoginPageUser"))
const SignupPage = lazy(() => import("./Pages/user/SignUpUser"))
const OtpVerification = lazy(() => import("./Pages/user/OtpVerificationUser"))
const Home = lazy(() => import("./Pages/user/Home"))
const ShopDetail = lazy(() => import("./Pages/user/ShopDetails"))
const ForgotPass = lazy(() => import("./Pages/user/ForgotPass"))
const UserLayout = lazy(() => import("./Pages/user/components/UserLayout"))
const Settings = lazy(() => import("./Pages/user/Settings"))
const BookingAppointment = lazy(() => import("./Pages/user/bookingAppointments"))
const Bookings = lazy(() => import("./Pages/user/Bookings"))

// Admin components
const AdminLoginPage = lazy(() => import("./Pages/admin/LoginAdmin"))
const AdminLayout = lazy(() => import("./Pages/admin/AdminLayout"))
const DashboardContent = lazy(() => import("./Pages/admin/DashboardContent"))
const UsersManagement = lazy(() => import("./Pages/admin/UserManagement"))
const ShopManagement = lazy(() => import("./Pages/admin/ShopManagement"))

// Shop components
const ShopLoginPage = lazy(() => import("./Pages/shops/ShopLogin"))
const ShopRegisterPage = lazy(() => import("./Pages/shops/ShopSignup"))
const ShopDashboard = lazy(() => import("./Pages/shops/ShopDashboard"))
const ShopOtpVerification = lazy(() => import("./Pages/shops/ShopOtpVerify"))
const ShopLayout = lazy(() => import("./Pages/shops/components/layout/ShopLayout"))
const ShopAppointments = lazy(() => import("./Pages/shops/ShopAppointments"))
const ShopServices = lazy(() => import("./Pages/shops/ShopServices"))
const ShopCustomers = lazy(() => import("./Pages/shops/ShopCustomers"))
const ShopAnalytics = lazy(() => import("./Pages/shops/ShopAnalytics"))
const ShopSettings = lazy(() => import("./Pages/shops/ShopSettings"))

// Enhanced Protected Route for HttpOnly Cookies
const SimpleProtectedUserRoute = ({ children }) => {
  const userData = localStorage.getItem("user_data");
  console.log("SimpleProtectedUserRoute - userData:", userData);
  
  if (!userData) {
    console.log("SimpleProtectedUserRoute - No user data, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  try {
    const parsed = JSON.parse(userData);
    console.log("SimpleProtectedUserRoute - Parsed user data:", parsed);
    return children;
  } catch (error) {
    console.log("SimpleProtectedUserRoute - Parse error:", error);
    localStorage.removeItem("user_data");
    return <Navigate to="/login" replace />;
  }
};

// Admin Protection with enhanced debugging
const ProtectedAdminRoute = ({ children }) => {
  console.log("ProtectedAdminRoute - Component rendered");
  
  const userData = localStorage.getItem("user_data");
  console.log("ProtectedAdminRoute - Raw userData:", userData);
  
  if (!userData) {
    console.log("ProtectedAdminRoute - No user data found, redirecting to admin login");
    return <Navigate to="/admin/login" replace />;
  }
  
  try {
    const user = JSON.parse(userData);
    console.log("ProtectedAdminRoute - Parsed user:", user);
    console.log("ProtectedAdminRoute - Superuser status:", user.superuser);
    
    if (!user.superuser) {
      console.log("ProtectedAdminRoute - Not superuser, redirecting to admin login");
      return <Navigate to="/admin/login" replace />;
    }
    
    console.log("ProtectedAdminRoute - Access granted, rendering children");
    return children;
  } catch (error) {
    console.error("ProtectedAdminRoute - Parse error:", error);
    localStorage.removeItem("user_data");
    return <Navigate to="/admin/login" replace />;
  }
};

// Shop Protection - Fixed incomplete implementation
const ProtectedShopRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // You need to implement getShopProfile or use your authentication method
      const shopData = localStorage.getItem("shop_data");
      if (shopData) {
        const parsed = JSON.parse(shopData);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Shop auth check error:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/shop/login" replace />;
  }

  return children;
};

function App() {
  console.log("App component rendered");
  
  return (
    <BrowserRouter>
      <LocationLogger />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* User routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/otp" element={<OtpVerification />} />
          <Route path="/forgot-password" element={<ForgotPass />} />
          
          {/* User routes with sidebar layout */}
          <Route path="/" element={
            <SimpleProtectedUserRoute>
              <UserLayout />
            </SimpleProtectedUserRoute>
          }>
            {/* Nested routes for the barber booking app */}
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="shop/:shopId" element={<ShopDetail />} />
            <Route path="booking/:shopId" element={<BookingAppointment />} />
            <Route path="settings" element={<Settings />} />
            <Route path="bookings" element={<Bookings />} />
          </Route>

          {/* Admin routes - Nested routing structure */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedAdminRoute>
                <AdminLayout />
              </ProtectedAdminRoute>
            }
          >
            <Route path="dashboard" element={<DashboardContent />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="shops" element={<ShopManagement />} />
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
          
          {/* Shop routes */}
          <Route path="/shop/login" element={<ShopLoginPage />} />
          <Route path="/shop/register" element={<ShopRegisterPage />} />
          <Route path="/shop/otp" element={<ShopOtpVerification />} />
          <Route path="/shop/forgot-password" element={<ForgotPass />} />

          <Route path="/shop" element={
            <ProtectedShopRoute>
              <ShopLayout />
            </ProtectedShopRoute>
          }>
            <Route index element={<Navigate to="/shop/dashboard" replace />} />
            <Route path="dashboard" element={<ShopDashboard />} />
            <Route path="appointments" element={<ShopAppointments />} />
            <Route path="services" element={<ShopServices />} />
            <Route path="customers" element={<ShopCustomers />} />
            <Route path="analytics" element={<ShopAnalytics />} />
            <Route path="settings" element={<ShopSettings />} />
          </Route>

          {/* Redirect any unknown routes to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App