from django.urls import path
from .views import (
    # CoustomTokenObtainPairView,
    # CoustomTokenRefreshView,
    CustomShopTokenObtainPairView,
    CustomShopTokenRefreshView,
    RecentAppointmentsView,
    ShopDashboardStatsView,
    ShopForgotPasswordView,
    ShopLogoutView,
    ShopNotificationsView,
    ShopProfileView,
    # ShopProfileView,
    ShopRegisterView,
    ShopResetPasswordView,
    ShopUpdateView,
    ShopVerifyForgotPasswordOTPView,
    ShopVerifyOTPView,
    ShopResendOTPView,
    # ShopLoginView,
    # TokenRefreshView,
    # TokenVerifyView,


        # New views
    ShopUpdateView,
    # TokenRefreshView,
    RecentAppointmentsView,
    ShopNotificationsView,
    ShopLogoutView,


    BusinessHoursView,
    BusinessHoursUpdateView,
    AvailableSlotsView,
    AppointmentCreateView,
    SpecialClosingDayView,
    SpecialClosingDayDetailView,

    ServiceListView,
    ServiceCreateView,
    ServiceUpdateView,
    ServiceDeleteView,

)

# These URLs will be included under 'api/auth/' prefix in your main urls.py
urlpatterns = [
    # Original shop-specific endpoints
    path('register/', ShopRegisterView.as_view(), name='shop-register'),
    path('verify-otp/', ShopVerifyOTPView.as_view(), name='shop-verify-otp'),
    path('resend-otp/', ShopResendOTPView.as_view(), name='shop-resend-otp'),
    path('shop/token/', CustomShopTokenObtainPairView.as_view(), name='shop-login'),
    path('shop/token/refresh/', CustomShopTokenRefreshView.as_view(), name='token-refresh'),
    path('dashboard/stats/', ShopDashboardStatsView.as_view(), name='shop-dashboard-stats'),
    
    # # JWT endpoints that match what your React frontend expects
    # path('jwt/create/', ShopLoginView.as_view(), name='token-obtain'),  # Alias for login
    # path('check-jwt/', TokenVerifyView.as_view(), name='token-verify'),  # Token verification endpoint
    # path('token/verify/', TokenVerifyView.as_view(), name='token-verify-alt'),  # Alternative path


    #     # New endpoints required by the Shop Dashboard component
    path('shop/profile/', ShopProfileView.as_view(), name='shop-profile'),
    path('shop/update/', ShopUpdateView.as_view(), name='shop-update'),
    path('appointments/recent/', RecentAppointmentsView.as_view(), name='recent-appointments'),
    path('notifications/', ShopNotificationsView.as_view(), name='shop-notifications'),
    path('shop/logout/', ShopLogoutView.as_view(), name='shop-logout'),


        # Business Hours endpoints
    path('shop/business-hours/', BusinessHoursView.as_view(), name='business_hours'),
    path('shop/business-hours/update/', BusinessHoursUpdateView.as_view(), name='business_hours_update'),
    
    # Available Slots endpoint
    path('shop/available-slots/', AvailableSlotsView.as_view(), name='available_slots'),
    
    # Appointment endpoint
    path('shop/appointments/create/', AppointmentCreateView.as_view(), name='create_appointment'),
    
    # Special Closing Days endpoints
    path('shop/special-closing-days/', SpecialClosingDayView.as_view(), name='special_closing_days'),
    path('shop/special-closing-days/add/', SpecialClosingDayView.as_view(), name='add_special_closing_day'),
    path('shop/special-closing-days/remove/<int:id>/', 
        SpecialClosingDayDetailView.as_view(), name='remove_special_closing_day'),


    path('shop/services/', ServiceListView.as_view(), name='service-list'),
    path('shop/services/create/', ServiceCreateView.as_view(), name='service-create'),
    path('shop/services/<int:id>/update/', ServiceUpdateView.as_view(), name='service-update'),
    path('shop/services/<int:id>/delete/', ServiceDeleteView.as_view(), name='service-delete'),


    path('forgot-password/', ShopForgotPasswordView.as_view(), name='mentor-forgot-password'),
    path('verify-forgot-password-otp/', ShopVerifyForgotPasswordOTPView.as_view(), name='mentor-verify-forgot-password-otp'),
    path('reset-password/', ShopResetPasswordView.as_view(), name='mentor-reset-password'),

]