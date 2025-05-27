from django.urls import path
from .views import CoustomTokenObtainPairView, CoustomTokenRefreshView, EmailOTPVerifyView, Logout, RegisterUserView, ResendOTPView

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # path('jwt/create/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('jwt/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/', CoustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CoustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/',Logout.as_view(), name='logout'),
    path('users/', RegisterUserView.as_view(), name='register_user'),
    path('verify-otp/', EmailOTPVerifyView.as_view(), name='verify-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    # path('check-user-status/', CheckUserStatusView.as_view(), name='check-user-status'),
    # path('check-jwt/', CheckJwtTokenView.as_view(), name='check-jwt'),

]


