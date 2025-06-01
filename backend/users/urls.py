from django.urls import path
from .views import CoustomTokenObtainPairView, CoustomTokenRefreshView, EmailOTPVerifyView, ForgotPasswordView, Logout, RegisterUserView, ResendOTPView, ResetPasswordView, VerifyForgotPasswordOTPView

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [

    path('token/', CoustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CoustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/',Logout.as_view(), name='logout'),
    path('users/', RegisterUserView.as_view(), name='register_user'),
    path('verify-otp/', EmailOTPVerifyView.as_view(), name='verify-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-forgot-password-otp/', VerifyForgotPasswordOTPView.as_view(), name='verify-forgot-password-otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),

]


