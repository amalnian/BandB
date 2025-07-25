"use client"
import React from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { lazy, Suspense, useState, useEffect } from "react"
import axios from "axios"
import { Provider } from "react-redux"
import { store, persistor } from "./store/store"
import { PersistGate } from "redux-persist/integration/react";
import Notification from "./Pages/user/components/Notifications"

// Create a loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin"></div>
  </div>
)

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex justify-center items-center h-screen flex-col">
          <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Please try refreshing the page</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Debug component to log current location
const LocationLogger = () => {
  const location = useLocation();
  useEffect(() => {
    console.log("Current route:", location.pathname);
  }, [location]);
  return null;
}

// Lazy load components with error handling
const LazyComponent = (importFunc) => {
  return lazy(() => 
    importFunc().catch(error => {
      console.error('Failed to load component:', error);
      return { default: () => <div>Failed to load component</div> };
    })
  );
};

// User components
const LoginPage = LazyComponent(() => import("./Pages/user/LoginPageUser"))
const SignupPage = LazyComponent(() => import("./Pages/user/SignUpUser"))
const OtpVerification = LazyComponent(() => import("./Pages/user/OtpVerificationUser"))
const Home = LazyComponent(() => import("./Pages/user/Home"))
const ShopDetail = LazyComponent(() => import("./Pages/user/ShopDetails"))
const ForgotPass = LazyComponent(() => import("./Pages/user/ForgotPass"))
const UserLayout = LazyComponent(() => import("./Pages/user/components/UserLayout"))
const Settings = LazyComponent(() => import("./Pages/user/Settings"))
const BookingAppointment = LazyComponent(() => import("./Pages/user/bookingAppointments"))
const Bookings = LazyComponent(() => import("./Pages/user/Bookings"))
const Chat = LazyComponent(() => import("./Pages/chat/ChatPage"))
const Wallet = LazyComponent(() => import("./Pages/user/wallet"))
const BookingConfirmation = LazyComponent(() => import("./Pages/user/bookingConfirmation"))


// Admin components
const AdminLoginPage = LazyComponent(() => import("./Pages/admin/LoginAdmin"))
const AdminLayout = LazyComponent(() => import("./Pages/admin/AdminLayout"))
const DashboardContent = LazyComponent(() => import("./Pages/admin/DashboardContent"))
const UsersManagement = LazyComponent(() => import("./Pages/admin/UserManagement"))
const ShopManagement = LazyComponent(() => import("./Pages/admin/ShopManagement"))
const AdminSettings = LazyComponent(() => import("./Pages/admin/Settings"))
const AdminShopPaymentsList = LazyComponent(() => import("./Pages/admin/Payments"))


// Shop components
const ShopLoginPage = LazyComponent(() => import("./Pages/shops/ShopLogin"))
const ShopRegisterPage = LazyComponent(() => import("./Pages/shops/ShopSignup"))
const ShopDashboard = LazyComponent(() => import("./Pages/shops/ShopDashboard"))
const ShopOtpVerification = LazyComponent(() => import("./Pages/shops/ShopOtpVerify"))
const ShopLayout = LazyComponent(() => import("./Pages/shops/components/layout/ShopLayout"))
const ShopAppointments = LazyComponent(() => import("./Pages/shops/ShopAppointments"))
const ShopServices = LazyComponent(() => import("./Pages/shops/ShopServices"))
const ShopCustomers = LazyComponent(() => import("./Pages/shops/ShopCustomers"))
const ShopFeedback = LazyComponent(() => import("./Pages/shops/components/Feedback"))
const ShopSettings = LazyComponent(() => import("./Pages/shops/ShopSettings"))
const ChatShop = LazyComponent(() => import("./Pages/chat/ChatPage"))
const ShopPaymentsList = LazyComponent(() => import("./Pages/shops/components/Payments"))

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
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ErrorBoundary>
          <BrowserRouter>
            {/* Move Notification component inside BrowserRouter */}
            <Notification/>
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
                  <Route path="/booking-confirmation/:bookingId" element={<BookingConfirmation />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="chat" element={<Chat />} />
                  <Route path="/chat/:conversationId" element={<Chat />} />
                  <Route path="wallet" element={<Wallet />} />
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
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardContent />} />
                  <Route path="users" element={<UsersManagement />} />
                  <Route path="shops" element={<ShopManagement />} />
                  <Route path="payments" element={<AdminShopPaymentsList />} />
                  <Route path="settings" element={
                    <ErrorBoundary>
                      <AdminSettings />
                    </ErrorBoundary>
                  } />
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
                  <Route path="feedbacks" element={<ShopFeedback />} />
                  <Route path="settings" element={<ShopSettings />} />
                  <Route path="chat" element={<ChatShop />} />
                  <Route path="chat/:conversationId" element={<ChatShop />} />
                  <Route path="payments" element={<ShopPaymentsList />} />
                </Route>

                {/* Redirect any unknown routes to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </PersistGate>
    </Provider>
  )
}

export default App