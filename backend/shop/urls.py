from django.urls import path
from .views import (
    RecentAppointmentsView,
    ShopDashboardStatsView,
    ShopLogoutView,
    ShopNotificationsView,
    ShopProfileView,
    ShopRegisterView,
    ShopUpdateView,
    ShopVerifyOTPView,
    ShopResendOTPView,
    ShopLoginView,
    TokenRefreshView,
    TokenVerifyView,


        # New views
    ShopUpdateView,
    TokenRefreshView,
    RecentAppointmentsView,
    ShopNotificationsView,
    ShopLogoutView
)

# These URLs will be included under 'api/auth/' prefix in your main urls.py
urlpatterns = [
    # Original shop-specific endpoints
    path('register/', ShopRegisterView.as_view(), name='shop-register'),
    path('verify-otp/', ShopVerifyOTPView.as_view(), name='shop-verify-otp'),
    path('resend-otp/', ShopResendOTPView.as_view(), name='shop-resend-otp'),
    path('login/', ShopLoginView.as_view(), name='shop-login'),
    path('dashboard/stats/', ShopDashboardStatsView.as_view(), name='shop-dashboard-stats'),
    
    # JWT endpoints that match what your React frontend expects
    path('jwt/create/', ShopLoginView.as_view(), name='token-obtain'),  # Alias for login
    path('check-jwt/', TokenVerifyView.as_view(), name='token-verify'),  # Token verification endpoint
    path('token/verify/', TokenVerifyView.as_view(), name='token-verify-alt'),  # Alternative path


        # New endpoints required by the Shop Dashboard component
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('shop/profile/', ShopProfileView.as_view(), name='shop-profile'),
    path('shop/update/', ShopUpdateView.as_view(), name='shop-update'),
    path('appointments/recent/', RecentAppointmentsView.as_view(), name='recent-appointments'),
    path('notifications/', ShopNotificationsView.as_view(), name='shop-notifications'),
    path('logout/', ShopLogoutView.as_view(), name='shop-logout'),
]