# views.py
from users.serializers import CustomTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomUserCreateSerializer, EmailOTPVerifySerializer, ForgotPasswordSerializer, ResetPasswordSerializer, VerifyForgotPasswordOTPSerializer
from rest_framework import generics, status
from rest_framework.response import Response
from .models import CustomUser
from rest_framework import permissions
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
# from .serializers import EmailOTPVerifySerializer
from rest_framework.views import APIView
from django.core.mail import send_mail
import random
import string  # Added missing import
from datetime import timedelta
from django.utils import timezone
from rest_framework.permissions import AllowAny
from django.conf import settings
import logging

# Set up logger
logger = logging.getLogger(__name__)

class CoustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    
    
    def post(self, request,*args, **kwargs):

        try:
            email=request.data.get("email")
            password=request.data.get("password")

            if not CustomUser.objects.filter(email=email).exists():
                return Response(
                    {"success":False,"message":"User with this account does not exist"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            response = super().post(request,*args, **kwargs)
            token = response.data

            access_token = token["access"]
            refresh_token = token["refresh"]

            res = Response(status=status.HTTP_200_OK)

            user = CustomUser.objects.get(email=email)
            res.data = {"success":True,"message":"user login successfully","userDetails":{"id":user.id,"username":user.username,"email":user.email}}

            res.set_cookie(
                key = "access_token",
                value=access_token,
                httponly=True,
                secure=True,
                samesite="None",
                path='/',
                max_age=3600
            )

            res.set_cookie(
                key = "refresh_token",
                value=refresh_token,
                httponly=True,
                secure=True,
                samesite="None",
                path='/',
                max_age=3600
            )
            return res

        except AuthenticationFailed:
            return Response(
                {"success":False,"message":"Invalid Credentials"},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            return Response(
                {"success":False,"message":f"An error occured: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CoustomTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
    def post(self,request,*args,**kwargs):
        
        try:
            refresh_token = request.COOKIES.get("refresh_token")
            if not refresh_token:
                return Response(
                    {"success":False,"message":"referesh token not Found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            request.data["refresh"] = refresh_token

            response = super().post(request,*args,**kwargs)

            if not "access" in response.data:
                return Response(
                    {"success":False,"message":"refresh token expired or invalid" },
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            token = response.data
            access_token = token["access"]
            res = Response(status=status.HTTP_201_CREATED)

            res.data = {"success":True,"message":"Access token refreshed"}

            res.set_cookie(
                key = "access_token",
                value=access_token,
                httponly=True,
                secure=True,
                samesite="None",
                path='/',
                max_age=3600
            )

            return res
        except Exception as e:
            return Response({"success":False,"message":f"An error occured: {str(e)}"},status=status.HTTP_400_BAD_REQUEST)

class RegisterUserView(generics.CreateAPIView):
    serializer_class = CustomUserCreateSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Let the serializer handle OTP generation and email sending
            user = serializer.save()
            
            return Response({
                'success': True,
                'message': 'Registration successful. Please check your email for verification code.',
                'email': user.email
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'message': 'Registration failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class EmailOTPVerifyView(generics.GenericAPIView):
    serializer_class = EmailOTPVerifySerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            
            try:
                user = CustomUser.objects.get(email=email)
                
                # Logger for debugging instead of print statements
                logger.debug(f"OTP Verification attempt for {email}")
                logger.debug(f"Current status: is_active={user.is_active}")
                
                # Check if OTP exists
                if not user.otp or not user.otp_created_at:
                    return Response({'error': 'No OTP found for this account. Please request a new one.'}, 
                                   status=status.HTTP_400_BAD_REQUEST)
                
                # Check if OTP is expired
                if timezone.now() > user.otp_created_at + timedelta(minutes=10):
                    return Response({'error': 'OTP has expired. Please request a new one.'}, 
                                   status=status.HTTP_400_BAD_REQUEST)

                # Verify OTP
                if user.otp != otp:
                    return Response({'error': 'Invalid OTP. Please try again.'}, 
                                   status=status.HTTP_400_BAD_REQUEST)

                # Update is_active flag
                user.is_active = True
                user.otp = None 
                user.otp_created_at = None
                user.save()
                
                return Response({
                    'message': 'Email verified successfully. You can now login.',
                    'status': {
                        'is_active': user.is_active,
                        'email': email
                    }
                }, status=status.HTTP_200_OK)
                
            except CustomUser.DoesNotExist:
                return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# class CheckJwtTokenView(APIView):
#     """View to check what's in a JWT token"""
    
#     def get(self, request):
#         """Returns information about the authenticated user from the JWT token"""
#         if not request.user.is_authenticated:
#             return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
        
#         user = request.user
#         return Response({
#             'user_id': user.id,
#             'email': user.email,
#             'username': user.username,
#             'is_active': user.is_active,
#             'is_staff': user.is_staff,
#             'is_superuser': user.is_superuser,
#             'role': user.role,  # Added role to the response
#         })

class ResendOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email=email)
            
            # Only allow resending OTP for inactive users
            if user.is_active:
                return Response({'error': 'Account is already active.'}, status=status.HTTP_400_BAD_REQUEST)
                
            # Generate new OTP
            otp = ''.join(random.choices(string.digits, k=6))
            user.otp = otp
            user.otp_created_at = timezone.now()
            user.save() 

            # Send OTP via email
            try:
                send_mail(
                    subject='Your OTP Code',
                    message=f'Your OTP is: {otp}. This code will expire in 10 minutes.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False
                )
                logger.info(f"OTP email resent to {email}")
            except Exception as e:
                logger.error(f"Failed to send OTP email to {email}: {str(e)}")
                return Response({'error': 'Failed to send OTP email.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({'message': 'OTP has been resent successfully.'}, status=status.HTTP_200_OK)
            
        except CustomUser.DoesNotExist:
            return Response({'error': 'User with this email does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        

class Logout(APIView):
    permission_classes=[AllowAny]
    
    def post(self,request):
        try:
            res = Response(status=status.HTTP_200_OK)
            res.data = {"success":True, "message":"logout successfully"}
            res.delete_cookie(
                key="access_token",
                path='/',
                samesite='None',
                
            )
            res.delete_cookie(
                key="refresh_token",
                path='/',
                samesite='None',
                
            )

            return res
        except Exception as e:
            return Response({"success":False , "message": f"Logout failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)



class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "OTP has been sent to your email"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyForgotPasswordOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyForgotPasswordOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            try:
                user = CustomUser.objects.get(email=email)
                
                # Check if OTP has expired (1 minute)
                if user.otp_created_at and (timezone.now() - user.otp_created_at).total_seconds() > 60:
                    user.otp = None
                    user.otp_created_at = None
                    user.save()
                    return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
                
                if user.otp != otp:
                    return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
                
                return Response({"message": "OTP verified successfully"}, status=status.HTTP_200_OK)
            except CustomUser.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            new_password = serializer.validated_data['new_password']
            
            try:
                user = CustomUser.objects.get(email=email)
                
                # Check if OTP has expired (1 minute)
                if user.otp_created_at and (timezone.now() - user.otp_created_at).total_seconds() > 60:
                    user.otp = None
                    user.otp_created_at = None
                    user.save()
                    return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
                
                if user.otp != otp:
                    return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
                
                user.set_password(new_password)
                user.otp = None  # Clear the OTP after successful password reset
                user.otp_created_at = None
                user.save()
                return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)
            except CustomUser.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)