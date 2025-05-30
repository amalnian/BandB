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

// Shop Protection
const ProtectedShopRoute = ({ children }) => {
  const shopData = localStorage.getItem("shop_data");
  
  if (!shopData) {
    return <Navigate to="/shop/login" replace />;
  }
  
  try {
    JSON.parse(shopData);
    return children;
  } catch (error) {
    localStorage.removeItem("shop_data");
    return <Navigate to="/shop/login" replace />;
  }
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
          
          {/* Home route with proper protection */}
          <Route path="/" element={
            <SimpleProtectedUserRoute>
              <Home />
            </SimpleProtectedUserRoute>
          } />
          
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
          <Route path="/shop/dashboard" element={
            <ProtectedShopRoute>
              <ShopDashboard />
            </ProtectedShopRoute>
          } />
          
          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App