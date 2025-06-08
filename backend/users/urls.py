from django.urls import path
from .views import AllShopsView, ChangePasswordView, CoustomTokenObtainPairView, CustomTokenRefreshView, EmailOTPVerifyView, ForgotPasswordView, GoogleAuthView, Logout, NearbyShopsView, ProfilePictureView, RegisterUserView, ResendOTPView, ResetPasswordView, SearchNearbyShopsView, UpdateUserLocationView, UpdateUserProfileView, UserProfileView, UserStatsView, VerifyForgotPasswordOTPView

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
]


