"use client"

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"
import Home from "./Pages/user/Home"

// Create a loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin"></div>
  </div>
)

// Lazy load components
const LoginPage = lazy(() => import("./Pages/user/LoginPageUser"))
const SignupPage = lazy(() => import("./Pages/user/SignUpUser"))
const OtpVerification = lazy(() => import("./Pages/user/OtpVerificationUser"))
const HomePage = lazy(() => import("./Pages/user/Home")) // Import the HomePage component

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

// Protected route components
const ProtectedAdminRoute = ({ children }) => {
  const token = localStorage.getItem("access_token")
  
  if (!token) {
    return <Navigate to="/admin/login" replace />
  }
  
  return children
}

const ProtectedUserRoute = ({ children }) => {
  const token = localStorage.getItem("user_token")
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

const ProtectedShopRoute = ({ children }) => {
  const token = localStorage.getItem("shop_access_token")
  
  if (!token) {
    return <Navigate to="/shop/login" replace />
  }
  
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* User routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/otp" element={<OtpVerification />} />
          <Route path="/" element={
            <ProtectedUserRoute>
              <Home />
            </ProtectedUserRoute>
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
            {/* These routes will render inside the AdminLayout's <Outlet /> */}
            <Route path="dashboard" element={<DashboardContent />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="shops" element={<ShopManagement />} />
            {/* Redirect from /admin to /admin/dashboard */}
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App