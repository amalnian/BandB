from django.urls import path
from .views import AllShopsView, AvailableTimeSlotsView, ChangePasswordView, CoustomTokenObtainPairView, CreateBookingView, CreateRazorpayOrderView, CustomTokenRefreshView, EmailOTPVerifyView, ForgotPasswordView, GoogleAuthView, HandlePaymentFailureView, Logout, NearbyShopsView, ProfilePictureView, RegisterUserView, ResendOTPView, ResetPasswordView, SearchNearbyShopsView, ServiceDurationView, ShopBusinessHoursView, ShopDetailView, ShopServicesView, UpdateUserLocationView, UpdateUserProfileView, UserProfileView, UserStatsView, VerifyForgotPasswordOTPView, VerifyRazorpayPaymentView

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [

    path('token/', CoustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/',Logout.as_view(), name='logout'),
    path('users/', RegisterUserView.as_view(), name='register_user'),
    path('verify-otp/', EmailOTPVerifyView.as_view(), name='verify-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-forgot-password-otp/', VerifyForgotPasswordOTPView.as_view(), name='verify-forgot-password-otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('google/', GoogleAuthView.as_view(), name='google-signin'),
    path('user/profile/', UserProfileView.as_view(), name='get_user_profile'),
    path('user/profile/update/', UpdateUserProfileView.as_view(), name='update_user_profile'),
    path('user/stats/', UserStatsView.as_view(), name='user_stats'),
    
    # Security endpoints
    path('user/change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # Profile picture endpoints
    path('user/profile-picture/', ProfilePictureView.as_view(), name='profile_picture'),


    path('user/update-location/', UpdateUserLocationView.as_view(), name='update-user-location'),
    path('shops/nearby/', NearbyShopsView.as_view(), name='nearby-shops'),
    path('shops/search-nearby/', SearchNearbyShopsView.as_view(), name='search-nearby-shops'),
    path('shops/', AllShopsView.as_view(), name='all-shops'),
    path('shopdetail/<int:id>/', ShopDetailView.as_view(), name='shop-detail'),


    path('shops/<int:shop_id>/services/', ShopServicesView.as_view(), name='shop-services'),
    path('shops/<int:shop_id>/business-hours/', ShopBusinessHoursView.as_view(), name='shop-business-hours'),
    path('shops/<int:shop_id>/available-slots/', AvailableTimeSlotsView.as_view(), name='available-slots'),
    path('shops/<int:shop_id>/service-duration/', ServiceDurationView.as_view(), name='service-duration'),
    path('bookings/create/', CreateBookingView.as_view(), name='create-booking'),


    path('payment/razorpay/create-order/', CreateRazorpayOrderView.as_view(), name='create-razorpay-order'),
    path('payment/razorpay/verify/', VerifyRazorpayPaymentView.as_view(), name='verify-razorpay-payment'),
    path('payment/razorpay/failure/', HandlePaymentFailureView.as_view(), name='handle-payment-failure'),
]


