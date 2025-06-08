# views.py
import re
from users.serializers import CustomTokenObtainPairSerializer, UserProfileSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from users.serializers import CustomUserCreateSerializer, EmailOTPVerifySerializer, ForgotPasswordSerializer, ResetPasswordSerializer, VerifyForgotPasswordOTPSerializer
from rest_framework import generics, status
from rest_framework.response import Response
from .models import CustomUser
from rest_framework import permissions
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
import cloudinary.uploader
from cloudinary.exceptions import Error as CloudinaryError
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

# from .serializers import EmailOTPVerifySerializer
from rest_framework.views import APIView
from django.core.mail import send_mail
import random
import string  # Added missing import
from datetime import datetime, timedelta
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

class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # Disable authentication for this view
    
    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.COOKIES.get("refresh_token")
            print(f"Refresh token from cookies: {refresh_token[:20] if refresh_token else 'None'}...")
            
            if not refresh_token:
                return Response(
                    {"success": False, "message": "Refresh token not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create a new request data dict with the refresh token
            data = {'refresh': refresh_token}
            
            # Temporarily replace request data
            original_data = request.data
            request._full_data = data
            
            # Call parent's post method
            response = super().post(request, *args, **kwargs)
            
            # Restore original data
            request._full_data = original_data
            
            # Check if refresh was successful
            if response.status_code == 200 and "access" in response.data:
                access_token = response.data["access"]
                
                # Consistent cookie settings
                cookie_settings = {
                    'httponly': True,
                    'secure': not settings.DEBUG,
                    'samesite': 'Lax' if settings.DEBUG else 'None',
                    'path': '/',
                }
                
                res = Response({
                    "success": True, 
                    "message": "Access token refreshed"
                }, status=status.HTTP_200_OK)

                res.set_cookie(
                    key="access_token",
                    value=access_token,
                    max_age=int(settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME').total_seconds()),
                    **cookie_settings
                )

                return res
            else:
                return Response(
                    {"success": False, "message": "Refresh token expired or invalid"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
        except Exception as e:
            print(f"Token refresh error: {str(e)}")
            return Response(
                {"success": False, "message": f"An error occurred: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

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
    
from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework_simplejwt.tokens import RefreshToken
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class GoogleAuthView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated access
    authentication_classes = []      # Disable authentication for this view
    
    def post(self, request):
        credential = request.data.get('credential')
        
        if not credential:
            print("No credential provided")
            return Response({
                'error': 'Google credential is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Verify the Google token
            GOOGLE_OAUTH2_CLIENT_ID = '1016181249848-kn59ov7i80ep5gj5g7qc05ncfg4qpp1j.apps.googleusercontent.com'
            
            
            idinfo = id_token.verify_oauth2_token(
                credential, 
                requests.Request(), 
                GOOGLE_OAUTH2_CLIENT_ID
            )
            
            print(f"Token verified, user info: {idinfo}")
            
            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')
            google_id = idinfo.get('sub')
            
            if not email:
                return Response({
                    'error': 'Email not provided by Google'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find or create user
            try:
                user = CustomUser.objects.get(email=email)
                print(f"Existing user found: {user.email}")
                # Update user info if needed
                if not user.first_name and first_name:
                    user.first_name = first_name
                if not user.last_name and last_name:
                    user.last_name = last_name
                user.save()
            except CustomUser.DoesNotExist:
                print(f"Creating new user for: {email}")
                # Create new user
                user = CustomUser.objects.create_user(
                    username=email,  # Use email as username
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True
                )
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Prepare response data
            user_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'name': f"{user.first_name} {user.last_name}".strip(),
                'role': getattr(user, 'role', 'user'),
            }
            
            response_data = {
                'message': 'Google sign-in successful',
                'data': {
                    'user': user_data
                },
                'access_token': str(access_token),
                'refresh_token': str(refresh)
            }
            
            print(f"Sending response: {response_data}")
            
            response = Response(response_data, status=status.HTTP_200_OK)
            
            # Consistent cookie settings
            cookie_settings = {
                'httponly': True,
                'secure': not settings.DEBUG,
                'samesite': 'Lax' if settings.DEBUG else 'None',
                'path': '/'
            }
            
            # Set HTTP-only cookies
            response.set_cookie(
                'access_token',
                str(access_token),
                max_age=int(settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME').total_seconds()),
                **cookie_settings
            )
            
            response.set_cookie(
                'refresh_token',
                str(refresh),
                max_age=int(settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME').total_seconds()),
                **cookie_settings
            )
            
            return response
            
        except ValueError as e:
            print(f"ValueError in Google auth: {e}")
            return Response({
                'error': f'Invalid Google token: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Exception in Google auth: {e}")
            return Response({
                'error': f'Google authentication failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


class UserProfileView(APIView):
    """Get current user's profile information"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = request.user
            serializer = UserProfileSerializer(user)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Failed to fetch profile',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateUserProfileView(APIView):
    """Update user profile information"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        try:
            user = request.user
            data = request.data.copy()
            
            # Remove sensitive fields that shouldn't be updated here
            sensitive_fields = ['password', 'is_staff', 'is_superuser', 'is_active', 'role', 'otp', 'is_blocked']
            for field in sensitive_fields:
                data.pop(field, None)
            
            # Validate email if provided
            if 'email' in data and data['email'] != user.email:
                if CustomUser.objects.filter(email=data['email']).exclude(id=user.id).exists():
                    return Response({
                        'success': False,
                        'field_errors': {'email': ['Email already exists']}
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate phone if provided
            if 'phone' in data and data['phone']:
                phone_pattern = re.compile(r'^\+?1?\d{9,15}$')
                if not phone_pattern.match(data['phone'].replace(' ', '').replace('-', '')):
                    return Response({
                        'success': False,
                        'field_errors': {'phone': ['Invalid phone number format']}
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate date_of_birth if provided
            if 'date_of_birth' in data and data['date_of_birth']:
                try:
                    birth_date = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
                    if birth_date > timezone.now().date():
                        return Response({
                            'success': False,
                            'field_errors': {'date_of_birth': ['Date of birth cannot be in the future']}
                        }, status=status.HTTP_400_BAD_REQUEST)
                except ValueError:
                    return Response({
                        'success': False,
                        'field_errors': {'date_of_birth': ['Invalid date format. Use YYYY-MM-DD']}
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = UserProfileSerializer(user, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'message': 'Profile updated successfully',
                    'data': serializer.data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'field_errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Failed to update profile',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChangePasswordView(APIView):
    """Change user password"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            old_password = request.data.get('old_password')
            new_password = request.data.get('new_password')
            confirm_password = request.data.get('confirm_password')
            
            # Validate input
            if not all([old_password, new_password, confirm_password]):
                return Response({
                    'success': False,
                    'message': 'All password fields are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check old password
            if not user.check_password(old_password):
                return Response({
                    'success': False,
                    'field_errors': {'old_password': ['Current password is incorrect']}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check new password confirmation
            if new_password != confirm_password:
                return Response({
                    'success': False,
                    'field_errors': {'confirm_password': ['Passwords do not match']}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate new password
            try:
                validate_password(new_password, user)
            except ValidationError as e:
                return Response({
                    'success': False,
                    'field_errors': {'new_password': list(e.messages)}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update password
            user.set_password(new_password)
            user.save()
            
            # Keep user logged in after password change
            update_session_auth_hash(request, user)
            
            return Response({
                'success': True,
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Failed to change password',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProfilePictureView(APIView):
    """Upload and delete user profile picture using Cloudinary"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Upload user profile picture to Cloudinary"""
        try:
            if 'profile_picture' not in request.FILES:
                return Response({
                    'success': False,
                    'message': 'No file provided'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            file = request.FILES['profile_picture']
            
            # Validate file type
            allowed_types = ['image/jpeg', 'image/png', 'image/gif']
            if file.content_type not in allowed_types:
                return Response({
                    'success': False,
                    'message': 'Invalid file type. Only JPEG, PNG, and GIF are allowed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate file size (5MB max)
            if file.size > 5 * 1024 * 1024:
                return Response({
                    'success': False,
                    'message': 'File size too large. Maximum 5MB allowed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user = request.user
            
            # Delete old image from Cloudinary if exists
            if user.profile_url:
                try:
                    # Extract public_id from the URL
                    public_id = self._extract_public_id(user.profile_url)
                    if public_id:
                        cloudinary.uploader.destroy(public_id)
                except CloudinaryError:
                    pass  # Continue even if deletion fails
            
            # Upload new image to Cloudinary
            try:
                upload_result = cloudinary.uploader.upload(
                    file,
                    folder="profile_pictures",
                    public_id=f"user_{user.id}_{timezone.now().timestamp()}",
                    overwrite=True,
                    resource_type="image",
                    transformation=[
                        {'width': 400, 'height': 400, 'crop': 'fill'},
                        {'quality': 'auto'},
                        {'format': 'jpg'}
                    ]
                )
                
                # Update user profile URL
                user.profile_url = upload_result['secure_url']
                user.save()
                
                return Response({
                    'success': True,
                    'message': 'Profile picture uploaded successfully',
                    'data': {
                        'profile_picture_url': user.profile_url
                    }
                }, status=status.HTTP_200_OK)
                
            except CloudinaryError as e:
                return Response({
                    'success': False,
                    'message': 'Failed to upload image to cloud storage',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Failed to upload profile picture',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        """Delete user profile picture from Cloudinary"""
        try:
            user = request.user
            
            if user.profile_url:
                try:
                    # Extract public_id from the URL
                    public_id = self._extract_public_id(user.profile_url)
                    if public_id:
                        cloudinary.uploader.destroy(public_id)
                except CloudinaryError:
                    pass  # Continue even if deletion fails
                
                # Remove URL from user profile
                user.profile_url = None
                user.save()
            
            return Response({
                'success': True,
                'message': 'Profile picture deleted successfully'
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Failed to delete profile picture',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _extract_public_id(self, cloudinary_url):
        """Extract public_id from Cloudinary URL"""
        try:

            parts = cloudinary_url.split('/')
            if 'upload' in parts:
                upload_index = parts.index('upload')
                if upload_index + 2 < len(parts):
                    # Get everything after version number, remove file extension
                    public_id_part = '/'.join(parts[upload_index + 2:])
                    return public_id_part.rsplit('.', 1)[0]  # Remove file extension
            return None
        except:
            return None


class UserStatsView(APIView):
    """Get user account statistics"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = request.user
            
            stats = {
                'account_created': user.date_joined.isoformat() if user.date_joined else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'is_active': user.is_active,
                'role': user.get_role_display(),
                'email_verified': user.is_active,  # Assuming active means email verified
                'has_profile_picture': bool(user.profile_url),
            }
            
            return Response({
                'success': True,
                'data': stats
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Failed to fetch user stats',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        








from django.shortcuts import render
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.core.serializers import serialize
from math import radians, cos, sin, asin, sqrt
import json
from decimal import Decimal
from .models import CustomUser
from shop.models import Shop
from .authentication import CoustomJWTAuthentication  # Import your custom JWT auth


class UpdateUserLocationView(APIView):
    authentication_classes = [CoustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Handle both JSON and form data
            if hasattr(request, 'data'):
                data = request.data
            else:
                data = json.loads(request.body)
                
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            
            if not latitude or not longitude:
                return Response({
                    'error': 'Latitude and longitude are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate coordinate ranges
            try:
                lat_float = float(latitude)
                lng_float = float(longitude)
                
                if not (-90 <= lat_float <= 90):
                    return Response({
                        'error': 'Latitude must be between -90 and 90'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                if not (-180 <= lng_float <= 180):
                    return Response({
                        'error': 'Longitude must be between -180 and 180'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except (ValueError, TypeError):
                return Response({
                    'error': 'Invalid coordinate values'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update user location
            user = request.user
            user.current_latitude = Decimal(str(latitude))
            user.current_longitude = Decimal(str(longitude))
            user.location_enabled = True
            user.save()
            
            return Response({
                'success': True,
                'message': 'Location updated successfully',
                'location': {
                    'latitude': float(user.current_latitude),
                    'longitude': float(user.current_longitude)
                }
            })
            
        except json.JSONDecodeError:
            return Response({
                'error': 'Invalid JSON data'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"UpdateUserLocationView error: {str(e)}")  # Debug logging
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NearbyShopsView(APIView):
    authentication_classes = [CoustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get parameters from query string
            user_lat = request.GET.get('latitude')
            user_lng = request.GET.get('longitude')
            radius = float(request.GET.get('radius', 10))  # Default 10km
            
            print(f"NearbyShopsView - Received params: lat={user_lat}, lng={user_lng}, radius={radius}")  # Debug
            
            # If no coordinates provided, try to get from user's saved location
            if not user_lat or not user_lng:
                user = request.user
                print(f"No coordinates in request, checking user saved location")  # Debug
                
                if user.current_latitude and user.current_longitude:
                    user_lat = float(user.current_latitude)
                    user_lng = float(user.current_longitude)
                    print(f"Using saved user location: lat={user_lat}, lng={user_lng}")  # Debug
                else:
                    print(f"No saved user location found")  # Debug
                    return Response({
                        'error': 'Location coordinates are required. Please enable location access.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                try:
                    user_lat = float(user_lat)
                    user_lng = float(user_lng)
                except (ValueError, TypeError):
                    return Response({
                        'error': 'Invalid coordinate values'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get all shops with coordinates and approved status
            shops = Shop.objects.filter(
                latitude__isnull=False,
                longitude__isnull=False,
                is_approved=True,
                is_active=True  # Only active shops
            ).select_related('user')
            
            print(f"Found {shops.count()} approved shops with coordinates")  # Debug
            
            # Filter shops within radius
            nearby_shops = []
            for shop in shops:
                try:
                    shop_lat = float(shop.latitude)
                    shop_lng = float(shop.longitude)
                    
                    distance = self.calculate_distance(
                        user_lat, user_lng, shop_lat, shop_lng
                    )
                    
                    print(f"Shop {shop.name}: distance = {distance:.2f}km")  # Debug
                    
                    if distance <= radius:
                        # Get additional shop data
                        try:
                            average_rating = shop.get_average_rating() if hasattr(shop, 'get_average_rating') else 0.0
                        except:
                            average_rating = 0.0
                            
                        shop_data = {
                            'id': shop.id,
                            'name': shop.name,
                            'email': shop.email,
                            'phone': shop.phone,
                            'address': shop.address,
                            'description': shop.description,
                            'owner_name': shop.owner_name,
                            'opening_hours': shop.opening_hours,
                            'latitude': shop_lat,
                            'longitude': shop_lng,
                            'distance': round(distance, 2),
                            'average_rating': average_rating,
                            'is_active': shop.is_active,
                            # Add image if exists
                            'image_url': shop.image.url if hasattr(shop, 'image') and shop.image else None,
                        }
                        nearby_shops.append(shop_data)
                        
                except (ValueError, TypeError) as e:
                    print(f"Error processing shop {shop.id}: {e}")  # Debug
                    continue
            
            # Sort by distance
            nearby_shops.sort(key=lambda x: x['distance'])
            
            print(f"Found {len(nearby_shops)} shops within {radius}km")  # Debug
            
            return Response({
                'success': True,
                'shops': nearby_shops,
                'total_count': len(nearby_shops),
                'search_radius': radius,
                'user_location': {
                    'latitude': user_lat,
                    'longitude': user_lng
                }
            })
            
        except ValueError as e:
            print(f"ValueError in NearbyShopsView: {e}")  # Debug
            return Response({
                'error': 'Invalid coordinate values'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Exception in NearbyShopsView: {e}")  # Debug
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate the great circle distance between two points 
        on the earth (specified in decimal degrees)
        Returns distance in kilometers
        """
        # Validate inputs
        if any(coord is None for coord in [lat1, lon1, lat2, lon2]):
            return float('inf')  # Return large distance if any coordinate is None
            
        try:
            # Convert decimal degrees to radians
            lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
            
            # Haversine formula
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            
            # Radius of earth in kilometers
            r = 6371
            
            return c * r
        except (ValueError, TypeError):
            return float('inf')


class SearchNearbyShopsView(APIView):
    """
    Combined view that updates user location and returns nearby shops
    """
    authentication_classes = [CoustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Handle both JSON and form data
            if hasattr(request, 'data'):
                data = request.data
            else:
                data = json.loads(request.body)
                
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            radius = float(data.get('radius', 10))
            
            print(f"SearchNearbyShopsView - Received: lat={latitude}, lng={longitude}, radius={radius}")  # Debug
            
            if not latitude or not longitude:
                return Response({
                    'error': 'Latitude and longitude are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate coordinates
            try:
                lat_float = float(latitude)
                lng_float = float(longitude)
                
                if not (-90 <= lat_float <= 90) or not (-180 <= lng_float <= 180):
                    return Response({
                        'error': 'Invalid coordinate range'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except (ValueError, TypeError):
                return Response({
                    'error': 'Invalid coordinate format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update user location first
            user = request.user
            user.current_latitude = Decimal(str(latitude))
            user.current_longitude = Decimal(str(longitude))
            user.location_enabled = True
            user.save()
            
            print(f"Updated user location: {user.current_latitude}, {user.current_longitude}")  # Debug
            
            # Create a new request object for the GET call
            from django.test import RequestFactory
            factory = RequestFactory()
            get_request = factory.get('/nearby-shops/', {
                'latitude': str(latitude),
                'longitude': str(longitude),
                'radius': str(radius)
            })
            
            # Copy authentication from original request
            get_request.user = request.user
            get_request.auth = getattr(request, 'auth', None)
            
            # Get nearby shops using the same logic as NearbyShopsView
            nearby_view = NearbyShopsView()
            return nearby_view.get(get_request)
            
        except json.JSONDecodeError:
            return Response({
                'error': 'Invalid JSON data'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"SearchNearbyShopsView error: {str(e)}")  # Debug
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AllShopsView(APIView):
    authentication_classes = [CoustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            shops = Shop.objects.filter(
                is_approved=True,
                is_active=True  # Only active shops
            ).select_related('user')
            
            shops_data = []
            for shop in shops:
                try:
                    average_rating = shop.get_average_rating() if hasattr(shop, 'get_average_rating') else 0.0
                except:
                    average_rating = 0.0
                    
                shop_data = {
                    'id': shop.id,
                    'name': shop.name,
                    'email': shop.email,
                    'phone': shop.phone,
                    'address': shop.address,
                    'description': shop.description,
                    'owner_name': shop.owner_name,
                    'opening_hours': shop.opening_hours,
                    'latitude': float(shop.latitude) if shop.latitude else None,
                    'longitude': float(shop.longitude) if shop.longitude else None,
                    'average_rating': average_rating,
                    'is_active': shop.is_active,
                    'image_url': shop.image.url if hasattr(shop, 'image') and shop.image else None,
                }
                shops_data.append(shop_data)
            
            return Response({
                'success': True,
                'shops': shops_data,
                'total_count': len(shops_data)
            })
            
        except Exception as e:
            print(f"AllShopsView error: {str(e)}")  # Debug
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)