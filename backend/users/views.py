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
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
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
    authentication_classes = []
    
    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.COOKIES.get("refresh_token")
            logger.info(f"Refresh token from cookies: {refresh_token[:20] if refresh_token else 'None'}...")
            
            if not refresh_token:
                return Response(
                    {"success": False, "message": "Refresh token not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                # Validate and refresh the token using Simple JWT's RefreshToken
                refresh = RefreshToken(refresh_token)
                access_token = str(refresh.access_token)
                
                # Consistent cookie settings
                cookie_settings = {
                    'httponly': True,
                    'secure': not settings.DEBUG,
                    'samesite': 'Lax' if settings.DEBUG else 'None',
                    'path': '/',
                }
                
                res = Response({
                    "success": True, 
                    "message": "Access token refreshed",
                    "access": access_token  # Include access token in response if needed
                }, status=status.HTTP_200_OK)

                res.set_cookie(
                    key="access_token",
                    value=access_token,
                    max_age=int(settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME').total_seconds()),
                    **cookie_settings
                )

                # If rotation is enabled, set new refresh token
                if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS', False):
                    new_refresh_token = str(refresh)
                    res.set_cookie(
                        key="refresh_token",
                        value=new_refresh_token,
                        max_age=int(settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME').total_seconds()),
                        **cookie_settings
                    )

                return res
                
            except TokenError as e:
                logger.error(f"Token error: {str(e)}")
                return Response(
                    {"success": False, "message": "Refresh token expired or invalid"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            except InvalidToken as e:
                logger.error(f"Invalid token: {str(e)}")
                return Response(
                    {"success": False, "message": "Invalid refresh token"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
        except Exception as e:
            logger.error(f"Unexpected token refresh error: {str(e)}")
            return Response(
                {"success": False, "message": "Token refresh failed"},
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
            data = request.data if hasattr(request, 'data') else json.loads(request.body)
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            
            if not latitude or not longitude:
                return Response({'error': 'Latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                lat_float = float(latitude)
                lng_float = float(longitude)
                if not (-90 <= lat_float <= 90):
                    return Response({'error': 'Latitude must be between -90 and 90'}, status=status.HTTP_400_BAD_REQUEST)
                if not (-180 <= lng_float <= 180):
                    return Response({'error': 'Longitude must be between -180 and 180'}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid coordinate values'}, status=status.HTTP_400_BAD_REQUEST)
            
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
            return Response({'error': 'Invalid JSON data'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_shop_primary_image(self, shop):
        """Get the primary image URL for a shop"""
        try:
            # Try to get primary image first
            primary_image = shop.images.filter(is_primary=True).first()
            if primary_image and primary_image.image_url:
                return primary_image.image_url
            
            # If no primary image, get the first available image
            first_image = shop.images.first()
            if first_image and first_image.image_url:
                return first_image.image_url
            
            # Check if shop has a direct image field (fallback)
            if hasattr(shop, 'image') and shop.image:
                return shop.image.url
            
            return None
        except Exception as e:
            print(f"Error getting shop image for {shop.name}: {e}")
            return None

    def get_shop_images_data(self, shop):
        """Get all images data for a shop"""
        try:
            images_data = []
            for image in shop.images.all():
                images_data.append({
                    'id': image.id,
                    'image_url': image.image_url,
                    'public_id': getattr(image, 'public_id', None),
                    'is_primary': image.is_primary,
                    'order': getattr(image, 'order', 0),
                    'width': getattr(image, 'width', None),
                    'height': getattr(image, 'height', None),
                })
            return images_data
        except Exception as e:
            print(f"Error getting shop images data for {shop.name}: {e}")
            return []

class NearbyShopsView(APIView):
    authentication_classes = [CoustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_shop_primary_image(self, shop):
        """Get the primary image URL for a shop"""
        try:
            # Try to get primary image first
            primary_image = shop.images.filter(is_primary=True).first()
            if primary_image and primary_image.image_url:
                return primary_image.image_url
            
            # If no primary image, get the first available image
            first_image = shop.images.first()
            if first_image and first_image.image_url:
                return first_image.image_url
            
            # Check if shop has a direct image field (fallback)
            if hasattr(shop, 'image') and shop.image:
                return shop.image.url
            
            return None
        except Exception as e:
            print(f"Error getting shop image for {shop.name}: {e}")
            return None

    def get_shop_images_data(self, shop):
        """Get all images data for a shop"""
        try:
            images_data = []
            for image in shop.images.all():
                images_data.append({
                    'id': image.id,
                    'image_url': image.image_url,
                    'public_id': getattr(image, 'public_id', None),
                    'is_primary': image.is_primary,
                    'order': getattr(image, 'order', 0),
                    'width': getattr(image, 'width', None),
                    'height': getattr(image, 'height', None),
                })
            return images_data
        except Exception as e:
            print(f"Error getting shop images data for {shop.name}: {e}")
            return []
    
    def get(self, request):
        try:
            user_lat = request.GET.get('latitude')
            user_lng = request.GET.get('longitude')
            radius = float(request.GET.get('radius', 10))
            
            if not user_lat or not user_lng:
                user = request.user
                if user.current_latitude and user.current_longitude:
                    user_lat = float(user.current_latitude)
                    user_lng = float(user.current_longitude)
                else:
                    return Response({'error': 'Location coordinates are required. Please enable location access.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                try:
                    user_lat = float(user_lat)
                    user_lng = float(user_lng)
                except (ValueError, TypeError):
                    return Response({'error': 'Invalid coordinate values'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Use prefetch_related to optimize image queries
            shops = Shop.objects.filter(
                latitude__isnull=False,
                longitude__isnull=False,
                user__is_active=True,
                is_approved=True,
                is_email_verified=True
            ).select_related('user').prefetch_related('images')
            
            nearby_shops = []
            for shop in shops:
                try:
                    shop_lat = float(shop.latitude)
                    shop_lng = float(shop.longitude)
                    distance = self.calculate_distance(user_lat, user_lng, shop_lat, shop_lng)
                    
                    if distance <= radius:
                        try:
                            average_rating = shop.get_average_rating() if hasattr(shop, 'get_average_rating') else 0.0
                        except:
                            average_rating = 0.0
                        
                        # Get images data
                        primary_image_url = self.get_shop_primary_image(shop)
                        images_data = self.get_shop_images_data(shop)
                        
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
                            'rating': average_rating,  # Add both for compatibility
                            'is_active': shop.is_active,
                            'image_url': primary_image_url,  # Primary image URL
                            'images': images_data,  # All images data
                            # Additional fields your frontend might expect
                            'cloudinary_url': primary_image_url,  # Alias for compatibility
                        }
                        nearby_shops.append(shop_data)
                except (ValueError, TypeError):
                    continue
            
            nearby_shops.sort(key=lambda x: x['distance'])
            
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
        except ValueError:
            return Response({'error': 'Invalid coordinate values'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        if any(coord is None for coord in [lat1, lon1, lat2, lon2]):
            return float('inf')
        try:
            lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            r = 6371
            return c * r
        except (ValueError, TypeError):
            return float('inf')

class SearchNearbyShopsView(APIView):
    authentication_classes = [CoustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            data = request.data if hasattr(request, 'data') else json.loads(request.body)
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            radius = float(data.get('radius', 10))
            
            if not latitude or not longitude:
                return Response({'error': 'Latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                lat_float = float(latitude)
                lng_float = float(longitude)
                if not (-90 <= lat_float <= 90) or not (-180 <= lng_float <= 180):
                    return Response({'error': 'Invalid coordinate range'}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid coordinate format'}, status=status.HTTP_400_BAD_REQUEST)
            
            user = request.user
            user.current_latitude = Decimal(str(latitude))
            user.current_longitude = Decimal(str(longitude))
            user.location_enabled = True
            user.save()
            
            from django.test import RequestFactory
            factory = RequestFactory()
            get_request = factory.get('/nearby-shops/', {
                'latitude': str(latitude),
                'longitude': str(longitude),
                'radius': str(radius)
            })
            get_request.user = request.user
            get_request.auth = getattr(request, 'auth', None)
            
            nearby_view = NearbyShopsView()
            return nearby_view.get(get_request)
        except json.JSONDecodeError:
            return Response({'error': 'Invalid JSON data'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AllShopsView(APIView):
    authentication_classes = [CoustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_shop_primary_image(self, shop):
        """Get the primary image URL for a shop"""
        try:
            # Try to get primary image first
            primary_image = shop.images.filter(is_primary=True).first()
            if primary_image and primary_image.image_url:
                return primary_image.image_url
            
            # If no primary image, get the first available image
            first_image = shop.images.first()
            if first_image and first_image.image_url:
                return first_image.image_url
            
            # Check if shop has a direct image field (fallback)
            if hasattr(shop, 'image') and shop.image:
                return shop.image.url
            
            return None
        except Exception as e:
            print(f"Error getting shop image for {shop.name}: {e}")
            return None

    def get_shop_images_data(self, shop):
        """Get all images data for a shop"""
        try:
            images_data = []
            for image in shop.images.all():
                images_data.append({
                    'id': image.id,
                    'image_url': image.image_url,
                    'public_id': getattr(image, 'public_id', None),
                    'is_primary': image.is_primary,
                    'order': getattr(image, 'order', 0),
                    'width': getattr(image, 'width', None),
                    'height': getattr(image, 'height', None),
                })
            return images_data
        except Exception as e:
            print(f"Error getting shop images data for {shop.name}: {e}")
            return []
    
    def get(self, request):
        try:
            # Use prefetch_related to optimize image queries
            shops = Shop.objects.filter(
                is_approved=True,
                user__is_active=True,
                is_email_verified=True
            ).select_related('user').prefetch_related('images')
            
            shops_data = []
            for shop in shops:
                try:
                    average_rating = shop.get_average_rating() if hasattr(shop, 'get_average_rating') else 0.0
                except:
                    average_rating = 0.0
                
                # Get images data
                primary_image_url = self.get_shop_primary_image(shop)
                images_data = self.get_shop_images_data(shop)
                    
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
                    'rating': average_rating,  # Add both for compatibility
                    'image_url': primary_image_url,  # Primary image URL
                    'images': images_data,  # All images data
                    # Additional fields your frontend might expect
                    'cloudinary_url': primary_image_url,  # Alias for compatibility
                }
                shops_data.append(shop_data)
            
            return Response({
                'success': True,
                'shops': shops_data,
                'total_count': len(shops_data)
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# views.py
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from shop.models import Shop
from shop.serializers import ShopSerializer
from django.http import Http404

class ShopDetailView(generics.RetrieveAPIView):
    """
    Retrieve shop details by ID
    """
    queryset = Shop.objects.all()
    serializer_class = ShopSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'

    def get_object(self):
        """
        Override to add custom logic and validation
        """
        shop_id = self.kwargs.get('id')
        
        # Validate shop_id
        if not shop_id:
            raise Http404("Shop ID is required")
        
        try:
            shop = get_object_or_404(Shop, id=shop_id)
            
            # Optional: Add business logic checks
            # if not shop.is_active:
            #     raise Http404("Shop is not active")
            
            return shop
            
        except Shop.DoesNotExist:
            logger.warning(f"Shop with ID {shop_id} not found")
            raise Http404("Shop not found")
        except Exception as e:
            logger.error(f"Error retrieving shop {shop_id}: {str(e)}")
            raise Http404("Error retrieving shop details")

    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve method for consistent response format
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Shop details retrieved successfully'
            }, status=status.HTTP_200_OK)
            
        except Http404 as e:
            return Response({
                'success': False,
                'data': None,
                'message': str(e)
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Unexpected error in shop detail view: {str(e)}")
            return Response({
                'success': False,
                'data': None,
                'message': 'An error occurred while retrieving shop details'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
from django.utils import timezone
from django.shortcuts import get_object_or_404
from shop.models import Shop, Service, BusinessHours, Booking
from shop.serializers import ServiceSerializer, BusinessHoursSerializer


class ShopServicesView(APIView):
    """
    Get all active services for a specific shop
    """
    permission_classes = [IsAuthenticated]  # Add if authentication required
    
    def get(self, request, shop_id):
        """Get all active services for a shop"""
        try:
            # Verify shop exists
            shop = get_object_or_404(Shop, id=shop_id)
            
            # Get active services for the shop
            services = Service.objects.filter(
                shop_id=shop_id, 
                is_active=True
            ).order_by('name')
            
            serializer = ServiceSerializer(services, many=True)
            return Response({
                'success': True,
                'data': serializer.data,
                'count': services.count()
            }, status=status.HTTP_200_OK)
            
        except Shop.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Shop not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'An error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ShopBusinessHoursView(APIView):
    """
    Get business hours for a specific shop
    """
    permission_classes = [IsAuthenticated]  # Add if authentication required
    
    def get(self, request, shop_id):
        """Get business hours for a shop"""
        try:
            # Verify shop exists
            shop = get_object_or_404(Shop, id=shop_id)
            
            # Get business hours for the shop
            business_hours = BusinessHours.objects.filter(
                shop_id=shop_id
            ).order_by('day_of_week')
            
            serializer = BusinessHoursSerializer(business_hours, many=True)
            return Response({
                'success': True,
                'data': serializer.data,
                'shop_name': shop.name
            }, status=status.HTTP_200_OK)
            
        except Shop.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Shop not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'An error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# class AvailableTimeSlotsView(APIView):
#     """
#     Generate available time slots based on business hours and existing bookings
#     """
#     permission_classes = [IsAuthenticated]  # Add if authentication required
    
#     def get(self, request, shop_id):
#         """Generate available time slots for a specific date"""
#         date_str = request.GET.get('date')
        
#         if not date_str:
#             return Response({
#                 'success': False,
#                 'error': 'Date parameter is required (format: YYYY-MM-DD)'
#             }, status=status.HTTP_400_BAD_REQUEST)
        
#         try:
#             # Verify shop exists
#             shop = get_object_or_404(Shop, id=shop_id)
            
#             # Parse the date
#             selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
#             day_of_week = selected_date.weekday()  # Monday is 0
            
#             # Check if date is in the past
#             if selected_date < timezone.now().date():
#                 return Response({
#                     'success': False,
#                     'error': 'Cannot book appointments for past dates'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Get business hours for the day
#             try:
#                 business_hours = BusinessHours.objects.get(
#                     shop_id=shop_id,
#                     day_of_week=day_of_week
#                 )
#             except BusinessHours.DoesNotExist:
#                 return Response({
#                     'success': False,
#                     'error': 'Business hours not configured for this day'
#                 }, status=status.HTTP_404_NOT_FOUND)
            
#             # If shop is closed on this day
#             if business_hours.is_closed:
#                 return Response({
#                     'success': True,
#                     'data': {
#                         'time_slots': [],
#                         'message': f'Shop is closed on {business_hours.get_day_of_week_display()}'
#                     }
#                 })
            
#             # Generate time slots
#             slots = self._generate_time_slots(
#                 business_hours, 
#                 selected_date, 
#                 shop_id
#             )
            
#             return Response({
#                 'success': True,
#                 'data': {
#                     'time_slots': slots,
#                     'date': date_str,
#                     'day': business_hours.get_day_of_week_display(),
#                     'shop_name': shop.name
#                 }
#             }, status=status.HTTP_200_OK)
            
#         except ValueError:
#             return Response({
#                 'success': False,
#                 'error': 'Invalid date format. Use YYYY-MM-DD'
#             }, status=status.HTTP_400_BAD_REQUEST)
            
#         except Shop.DoesNotExist:
#             return Response({
#                 'success': False,
#                 'error': 'Shop not found'
#             }, status=status.HTTP_404_NOT_FOUND)
            
#         except Exception as e:
#             return Response({
#                 'success': False,
#                 'error': f'An error occurred: {str(e)}'
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
#     def _generate_time_slots(self, business_hours, selected_date, shop_id):
#         """Generate time slots based on business hours and check availability"""
#         slots = []
#         current_time = business_hours.opening_time
#         closing_time = business_hours.closing_time
#         slot_duration = timedelta(minutes=30)
        
#         # Get current time if the selected date is today
#         now = timezone.now()
#         is_today = selected_date == now.date()
#         current_hour_minute = now.time() if is_today else None
        
#         while current_time < closing_time:
#             # Check if slot is in the past (for today only)
#             is_past_slot = False
#             if is_today and current_hour_minute:
#                 is_past_slot = current_time <= current_hour_minute
            
#             # Check if slot is available (not booked)
#             is_available = self._is_slot_available(
#                 shop_id, 
#                 selected_date, 
#                 current_time
#             ) and not is_past_slot
            
#             slots.append({
#                 'time': current_time.strftime('%H:%M'),
#                 'available': is_available,
#                 'is_past': is_past_slot
#             })
            
#             # Add 30 minutes to current time
#             current_datetime = datetime.combine(selected_date, current_time)
#             current_datetime += slot_duration
#             current_time = current_datetime.time()
            
#             # Prevent infinite loop
#             if current_time <= current_datetime.time():
#                 break
        
#         return slots
    
#     def _is_slot_available(self, shop_id, date, time):
#         """
#         Check if a time slot is available (not booked)
#         You can customize this logic based on your Booking model
#         """
#         try:
#             # Example booking conflict check
#             # Adjust this query based on your Booking model structure
#             existing_bookings = Booking.objects.filter(
#                 shop_id=shop_id,
#                 appointment_date=date,
#                 appointment_time=time,
#                 status__in=['confirmed', 'pending']  # Adjust based on your status choices
#             ).exists()
            
#             return not existing_bookings
            
#         except Exception:
#             # If Booking model doesn't exist or has different structure
#             # Return True for now (all slots available)
#             return True


# class CreateBookingView(APIView):
#     """
#     Create a new booking
#     """
#     permission_classes = [IsAuthenticated]
    
#     def post(self, request):
#         """Create a new booking"""
#         try:
#             booking_data = request.data
            
#             # Validate required fields
#             required_fields = ['shop', 'services', 'appointment_date', 'appointment_time']
#             missing_fields = [field for field in required_fields if field not in booking_data]
            
#             if missing_fields:
#                 return Response({
#                     'success': False,
#                     'error': f'Missing required fields: {", ".join(missing_fields)}'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Validate shop exists
#             shop_id = booking_data.get('shop')
#             shop = get_object_or_404(Shop, id=shop_id)
            
#             # Validate services exist
#             service_ids = booking_data.get('services', [])
#             if not service_ids:
#                 return Response({
#                     'success': False,
#                     'error': 'At least one service must be selected'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             services = Service.objects.filter(
#                 id__in=service_ids,
#                 shop_id=shop_id,
#                 is_active=True
#             )
            
#             if len(services) != len(service_ids):
#                 return Response({
#                     'success': False,
#                     'error': 'One or more selected services are invalid'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Validate date and time
#             try:
#                 appointment_date = datetime.strptime(
#                     booking_data['appointment_date'], '%Y-%m-%d'
#                 ).date()
#                 appointment_time = datetime.strptime(
#                     booking_data['appointment_time'], '%H:%M'
#                 ).time()
#             except ValueError:
#                 return Response({
#                     'success': False,
#                     'error': 'Invalid date or time format'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Check if slot is still available
#             time_slots_view = AvailableTimeSlotsView()
#             is_available = time_slots_view._is_slot_available(
#                 shop_id, 
#                 appointment_date, 
#                 appointment_time
#             )
            
#             if not is_available:
#                 return Response({
#                     'success': False,
#                     'error': 'Selected time slot is no longer available'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             # Calculate total amount
#             total_amount = sum(service.price for service in services)
#             service_fee = booking_data.get('service_fee', 25)  # Default service fee
#             total_amount += service_fee
            
#             # Create booking (adjust based on your Booking model)
#             booking_data_processed = {
#                 'user': request.user,  # Assuming authenticated user
#                 'shop': shop,
#                 'appointment_date': appointment_date,
#                 'appointment_time': appointment_time,
#                 'total_amount': total_amount,
#                 'payment_method': booking_data.get('payment_method', 'wallet'),
#                 'status': 'pending',  # Default status
#                 'notes': booking_data.get('notes', '')
#             }
            
#             # If you have a Booking model, create it here
#             # booking = Booking.objects.create(**booking_data_processed)
#             # booking.services.set(services)  # If many-to-many relationship
            
#             # For now, return success response with mock data
#             response_data = {
#                 'success': True,
#                 'data': {
#                     'id': 1,  # Replace with actual booking.id
#                     'message': 'Booking created successfully',
#                     'shop_name': shop.name,
#                     'appointment_date': appointment_date.strftime('%Y-%m-%d'),
#                     'appointment_time': appointment_time.strftime('%H:%M'),
#                     'services': [service.name for service in services],
#                     'total_amount': float(total_amount),
#                     'status': 'pending'
#                 }
#             }
            
#             return Response(response_data, status=status.HTTP_201_CREATED)
            
#         except Shop.DoesNotExist:
#             return Response({
#                 'success': False,
#                 'error': 'Shop not found'
#             }, status=status.HTTP_404_NOT_FOUND)
            
#         except Exception as e:
#             return Response({
#                 'success': False,
#                 'error': f'An error occurred: {str(e)}'
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

# views.py - Enhanced version with duration-based slot booking

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q
from shop.models import Shop, Service, BusinessHours, Booking
from shop.serializers import ServiceSerializer, BusinessHoursSerializer
import math


class AvailableTimeSlotsView(APIView):
    """
    Generate available time slots based on business hours and existing bookings
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, shop_id):
        """Generate available time slots for a specific date"""
        date_str = request.GET.get('date')
        service_ids = request.GET.getlist('services', [])  # Get selected services
        
        if not date_str:
            return Response({
                'success': False,
                'error': 'Date parameter is required (format: YYYY-MM-DD)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Verify shop exists
            shop = get_object_or_404(Shop, id=shop_id)
            
            # Parse the date
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            day_of_week = selected_date.weekday()  # Monday is 0
            
            # Check if date is in the past
            if selected_date < timezone.now().date():
                return Response({
                    'success': False,
                    'error': 'Cannot book appointments for past dates'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get business hours for the day
            try:
                business_hours = BusinessHours.objects.get(
                    shop=shop,
                    day_of_week=day_of_week
                )
            except BusinessHours.DoesNotExist:
                return Response({
                    'success': True,
                    'data': {
                        'time_slots': [],
                        'message': 'Business hours not configured for this day'
                    }
                })
            
            # If shop is closed on this day
            if business_hours.is_closed:
                return Response({
                    'success': True,
                    'data': {
                        'time_slots': [],
                        'message': f'Shop is closed on {business_hours.get_day_of_week_display()}'
                    }
                })
            
            # Calculate total duration needed for selected services
            total_duration = 0
            if service_ids:
                selected_services = Service.objects.filter(
                    id__in=service_ids,
                    shop=shop,
                    is_active=True
                )
                total_duration = sum(service.duration_minutes for service in selected_services)
            
            # Generate time slots
            slots = self._generate_time_slots_with_duration(
                business_hours, 
                selected_date, 
                shop_id,
                total_duration
            )
            
            return Response({
                'success': True,
                'data': {
                    'time_slots': slots,
                    'date': date_str,
                    'day': business_hours.get_day_of_week_display(),
                    'shop_name': shop.name,
                    'total_duration': total_duration,
                    'slots_needed': math.ceil(total_duration / 30) if total_duration > 0 else 1
                }
            }, status=status.HTTP_200_OK)
            
        except ValueError:
            return Response({
                'success': False,
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Shop.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Shop not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'An error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_time_slots_with_duration(self, business_hours, selected_date, shop_id, total_duration):
        """Generate time slots considering service duration"""
        slots = []
        
        # Check if business hours has opening and closing times
        if not business_hours.opening_time or not business_hours.closing_time:
            return slots
        
        current_time = business_hours.opening_time
        closing_time = business_hours.closing_time
        slot_duration = timedelta(minutes=30)
        
        # Calculate how many 30-minute slots are needed
        slots_needed = math.ceil(total_duration / 30) if total_duration > 0 else 1
        
        # Get current time if the selected date is today
        now = timezone.now()
        is_today = selected_date == now.date()
        current_hour_minute = now.time() if is_today else None
        
        while current_time < closing_time:
            # Calculate slot end time (always 30 minutes)
            slot_end_time = self._add_minutes_to_time(current_time, 30)

            # Check if there's enough time before closing for the entire service starting from this slot
            service_end_time = self._add_minutes_to_time(current_time, total_duration if total_duration > 0 else 30)

            # Skip if service would end after closing time
            if service_end_time > closing_time:
                break
            
            # Check if slot is in the past (for today only)
            is_past_slot = False
            if is_today and current_hour_minute:
                is_past_slot = current_time <= current_hour_minute
            
            # Check if consecutive slots are available
            is_available = self._are_consecutive_slots_available(
                shop_id, 
                selected_date, 
                current_time,
                slots_needed
            ) and not is_past_slot
            
            slots.append({
                'time': current_time.strftime('%H:%M'),
                'end_time': slot_end_time.strftime('%H:%M'),  # Changed from service_end_time to slot_end_time
                'service_end_time': service_end_time.strftime('%H:%M'),  # Add this for reference
                'available': is_available,
                'is_past': is_past_slot,
                'slots_needed': slots_needed,
                'duration': 30  # Always 30 minutes per slot
            })
            
            # Add 30 minutes to current time
            current_datetime = datetime.combine(selected_date, current_time)
            current_datetime += slot_duration
            current_time = current_datetime.time()
            
            # Prevent infinite loop
            if len(slots) > 48:
                break
        
        return slots
    
    def _add_minutes_to_time(self, time_obj, minutes):
        """Add minutes to a time object"""
        datetime_obj = datetime.combine(datetime.today(), time_obj)
        datetime_obj += timedelta(minutes=minutes)
        return datetime_obj.time()
    
    def _are_consecutive_slots_available(self, shop_id, date, start_time, slots_needed):
        """
        Check if consecutive time slots are available for booking
        """
        try:
            for i in range(slots_needed):
                slot_time = self._add_minutes_to_time(start_time, i * 30)
                
                # Check if this specific slot is booked
                # FIXED: Changed 'status' to 'booking_status'
                existing_booking = Booking.objects.filter(
                    shop_id=shop_id,
                    appointment_date=date,
                    booking_status__in=['confirmed', 'pending']  # Changed from status to booking_status
                ).filter(
                    Q(appointment_time__lte=slot_time) & 
                    Q(appointment_time__gt=self._add_minutes_to_time(slot_time, -30))
                ).exists()
                
                if existing_booking:
                    return False
                    
                # Also check if any existing booking overlaps with this slot
                # FIXED: Changed 'status' to 'booking_status'
                overlapping_bookings = Booking.objects.filter(
                    shop_id=shop_id,
                    appointment_date=date,
                    booking_status__in=['confirmed', 'pending']  # Changed from status to booking_status
                )
                
                for booking in overlapping_bookings:
                    booking_duration = self._get_booking_total_duration(booking)
                    booking_end_time = self._add_minutes_to_time(booking.appointment_time, booking_duration)
                    
                    # Check if there's an overlap
                    if (booking.appointment_time <= slot_time < booking_end_time):
                        return False
            
            return True
            
        except Exception as e:
            print(f"Error checking consecutive slots availability: {e}")
            return False
    
    def _get_booking_total_duration(self, booking):
        """Calculate total duration of a booking based on its services"""
        total_duration = 0
        for service in booking.services.all():
            total_duration += service.duration_minutes
        return total_duration if total_duration > 0 else 30


class CreateBookingView(APIView):
    """
    Create a new booking with duration-based slot reservation
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create a new booking"""
        try:
            booking_data = request.data
            
            # Validate required fields
            required_fields = ['shop', 'services', 'appointment_date', 'appointment_time']
            missing_fields = [field for field in required_fields if field not in booking_data]
            
            if missing_fields:
                return Response({
                    'success': False,
                    'error': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate shop exists
            shop_id = booking_data.get('shop')
            shop = get_object_or_404(Shop, id=shop_id)
            
            # Validate services exist
            service_ids = booking_data.get('services', [])
            if not service_ids:
                return Response({
                    'success': False,
                    'error': 'At least one service must be selected'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            services = Service.objects.filter(
                id__in=service_ids,
                shop=shop,
                is_active=True
            )
            
            if len(services) != len(service_ids):
                return Response({
                    'success': False,
                    'error': 'One or more selected services are invalid'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate total duration
            total_duration = sum(service.duration_minutes for service in services)
            slots_needed = math.ceil(total_duration / 30)
            
            # Validate date and time
            try:
                appointment_date = datetime.strptime(
                    booking_data['appointment_date'], '%Y-%m-%d'
                ).date()
                appointment_time = datetime.strptime(
                    booking_data['appointment_time'], '%H:%M'
                ).time()
            except ValueError:
                return Response({
                    'success': False,
                    'error': 'Invalid date or time format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if consecutive slots are still available
            time_slots_view = AvailableTimeSlotsView()
            are_slots_available = time_slots_view._are_consecutive_slots_available(
                shop_id, 
                appointment_date, 
                appointment_time,
                slots_needed
            )
            
            if not are_slots_available:
                return Response({
                    'success': False,
                    'error': f'Selected time slot is no longer available. Need {slots_needed} consecutive slots for {total_duration} minutes.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate total amount
            total_amount = sum(float(service.price) for service in services)
            service_fee = float(booking_data.get('service_fee', 25))
            total_amount += service_fee
            
            # Create booking
            booking = Booking.objects.create(
                user=request.user,
                shop=shop,
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                total_amount=total_amount,
                payment_method=booking_data.get('payment_method', 'wallet'),
                status='pending',
                notes=booking_data.get('notes', '')
            )
            
            # Add services to booking
            booking.services.set(services)
            
            # Calculate end time for response
            end_time = time_slots_view._add_minutes_to_time(appointment_time, total_duration)
            
            response_data = {
                'success': True,
                'data': {
                    'id': booking.id,
                    'message': 'Booking created successfully',
                    'shop_name': shop.name,
                    'appointment_date': appointment_date.strftime('%Y-%m-%d'),
                    'appointment_time': appointment_time.strftime('%H:%M'),
                    'appointment_end_time': end_time.strftime('%H:%M'),
                    'services': [service.name for service in services],
                    'total_duration': total_duration,
                    'slots_reserved': slots_needed,
                    'total_amount': float(total_amount),
                    'status': 'pending'
                }
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Shop.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Shop not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'An error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Additional utility view to check slot requirements
class ServiceDurationView(APIView):
    """
    Calculate total duration and slots needed for selected services
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, shop_id):
        """Calculate duration for selected services"""
        try:
            service_ids = request.data.get('services', [])
            
            if not service_ids:
                return Response({
                    'success': False,
                    'error': 'No services provided'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            shop = get_object_or_404(Shop, id=shop_id)
            
            services = Service.objects.filter(
                id__in=service_ids,
                shop=shop,
                is_active=True
            )
            
            total_duration = sum(service.duration_minutes for service in services)
            slots_needed = math.ceil(total_duration / 30)
            
            return Response({
                'success': True,
                'data': {
                    'total_duration': total_duration,
                    'slots_needed': slots_needed,
                    'services': [
                        {
                            'id': service.id,
                            'name': service.name,
                            'duration': service.duration_minutes,
                            'price': float(service.price)
                        } for service in services
                    ]
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'An error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

# views.py
import razorpay
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import json
import hmac
import hashlib
from django.db import transaction  # Add this line


# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

class CreateRazorpayOrderView(APIView):
    """Create Razorpay order for payment"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            data = request.data
            amount = data.get('amount')
            
            if not amount:
                return Response({
                    'success': False,
                    'error': 'Amount is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Convert to paise and validate
            try:
                amount_in_paise = int(float(amount) * 100)
                if amount_in_paise <= 0:
                    return Response({
                        'success': False,
                        'error': 'Amount must be greater than 0'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({
                    'success': False,
                    'error': 'Invalid amount format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create Razorpay order
            order_data = {
                'amount': amount_in_paise,
                'currency': 'INR',
                'payment_capture': 1,
                'notes': {
                    'user_id': str(request.user.id),
                }
            }
            
            razorpay_order = razorpay_client.order.create(order_data)
            
            return Response({
                'success': True,
                'data': {
                    'order_id': razorpay_order['id'],
                    'amount': razorpay_order['amount'],
                    'currency': razorpay_order['currency'],
                    'key_id': settings.RAZORPAY_KEY_ID
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Order creation error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Order creation failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyRazorpayPaymentView(APIView):
    """Verify payment and create booking"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            data = request.data
            logger.info(f"Payment verification request: {data}")
            
            # Get payment details
            razorpay_order_id = data.get('razorpay_order_id')
            razorpay_payment_id = data.get('razorpay_payment_id')
            razorpay_signature = data.get('razorpay_signature')
            
            # Validate required fields
            if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
                logger.error("Missing payment details")
                return Response({
                    'success': False,
                    'error': 'Missing payment details'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify signature
            message = f"{razorpay_order_id}|{razorpay_payment_id}"
            generated_signature = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(generated_signature, razorpay_signature):
                logger.error("Payment signature verification failed")
                return Response({
                    'success': False,
                    'error': 'Payment verification failed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get booking data
            booking_data = data.get('booking_data', {})
            logger.info(f"Booking data: {booking_data}")
            
            # Validate booking data
            required_fields = ['shop', 'services', 'appointment_date', 'appointment_time', 'total_amount']
            missing_fields = []
            for field in required_fields:
                if not booking_data.get(field):
                    missing_fields.append(field)
            
            if missing_fields:
                logger.error(f"Missing booking fields: {missing_fields}")
                return Response({
                    'success': False,
                    'error': f'Missing fields in booking data: {", ".join(missing_fields)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate shop exists
            try:
                shop = get_object_or_404(Shop, id=booking_data['shop'])
            except Exception as e:
                logger.error(f"Shop validation error: {str(e)}")
                return Response({
                    'success': False,
                    'error': 'Invalid shop'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate services exist
            try:
                services = Service.objects.filter(
                    id__in=booking_data['services'],
                    shop=shop,
                    is_active=True
                )
                if len(services) != len(booking_data['services']):
                    logger.error("Some services are invalid")
                    return Response({
                        'success': False,
                        'error': 'Some selected services are invalid'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Service validation error: {str(e)}")
                return Response({
                    'success': False,
                    'error': 'Service validation failed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Parse date and time
            try:
                appointment_date = datetime.strptime(
                    booking_data['appointment_date'], '%Y-%m-%d'
                ).date()
                appointment_time = datetime.strptime(
                    booking_data['appointment_time'], '%H:%M'
                ).time()
            except ValueError as e:
                logger.error(f"Date/time parsing error: {str(e)}")
                return Response({
                    'success': False,
                    'error': 'Invalid date or time format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create booking with transaction
            try:
                with transaction.atomic():
                    # Create booking with explicit field mapping
                    booking = Booking.objects.create(
                        user=request.user,
                        shop=shop,  # Use shop object, not ID
                        appointment_date=appointment_date,
                        appointment_time=appointment_time,
                        total_amount=booking_data['total_amount'],
                        booking_status='confirmed',  # Paid bookings are confirmed
                        payment_status='paid',
                        payment_method='razorpay',
                        razorpay_order_id=razorpay_order_id,
                        razorpay_payment_id=razorpay_payment_id,
                        notes=booking_data.get('notes', '')
                    )
                    
                    # Add services
                    booking.services.set(services)
                    
                    logger.info(f"Booking created successfully: {booking.id}")
                    
                    return Response({
                        'success': True,
                        'message': 'Booking created successfully',
                        'data': {
                            'booking_id': booking.id,
                            'payment_id': razorpay_payment_id,
                            'booking_status': booking.booking_status,
                            'appointment_date': booking.appointment_date.strftime('%Y-%m-%d'),
                            'appointment_time': booking.appointment_time.strftime('%H:%M'),
                            'shop_name': shop.name,
                            'services': [service.name for service in services],
                            'total_amount': str(booking.total_amount)
                        }
                    }, status=status.HTTP_200_OK)
                    
            except Exception as e:
                logger.error(f"Booking creation error: {str(e)}")
                return Response({
                    'success': False,
                    'error': f'Booking creation failed: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Payment verification error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Payment verification failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AvailableTimeSlotsView(APIView):
    """
    Generate available time slots based on business hours and existing bookings
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, shop_id):
        """Generate available time slots for a specific date"""
        try:
            date_str = request.GET.get('date')
            service_ids = request.GET.getlist('services', [])
            
            if not date_str:
                return Response({
                    'success': False,
                    'error': 'Date parameter is required (format: YYYY-MM-DD)'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify shop exists
            shop = get_object_or_404(Shop, id=shop_id)
            
            # Parse the date
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            day_of_week = selected_date.weekday()
            
            # Check if date is in the past
            if selected_date < timezone.now().date():
                return Response({
                    'success': False,
                    'error': 'Cannot book appointments for past dates'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get business hours for the day
            try:
                business_hours = BusinessHours.objects.get(
                    shop=shop,
                    day_of_week=day_of_week
                )
            except BusinessHours.DoesNotExist:
                return Response({
                    'success': True,
                    'data': {
                        'time_slots': [],
                        'message': 'Business hours not configured for this day'
                    }
                })
            
            # If shop is closed on this day
            if business_hours.is_closed:
                return Response({
                    'success': True,
                    'data': {
                        'time_slots': [],
                        'message': f'Shop is closed on {business_hours.get_day_of_week_display()}'
                    }
                })
            
            # Calculate total duration needed for selected services
            total_duration = 0
            if service_ids:
                selected_services = Service.objects.filter(
                    id__in=service_ids,
                    shop=shop,
                    is_active=True
                )
                total_duration = sum(service.duration_minutes for service in selected_services)
            
            # Generate time slots
            slots = self._generate_time_slots_with_duration(
                business_hours, 
                selected_date, 
                shop_id,
                total_duration
            )
            
            return Response({
                'success': True,
                'data': {
                    'time_slots': slots,
                    'date': date_str,
                    'day': business_hours.get_day_of_week_display(),
                    'shop_name': shop.name,
                    'total_duration': total_duration,
                    'slots_needed': math.ceil(total_duration / 30) if total_duration > 0 else 1
                }
            }, status=status.HTTP_200_OK)
            
        except ValueError:
            return Response({
                'success': False,
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Available slots error: {str(e)}")
            return Response({
                'success': False,
                'error': f'An error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _are_consecutive_slots_available(self, shop_id, date, start_time, slots_needed):
        """
        Check if consecutive time slots are available for booking
        """
        try:
            for i in range(slots_needed):
                slot_time = self._add_minutes_to_time(start_time, i * 30)
                
                # Check if this specific slot is booked
                # FIXED: Use correct field name
                existing_booking = Booking.objects.filter(
                    shop_id=shop_id,
                    appointment_date=date,
                    booking_status__in=['confirmed', 'pending']  # Fixed field name
                ).filter(
                    Q(appointment_time__lte=slot_time) & 
                    Q(appointment_time__gt=self._add_minutes_to_time(slot_time, -30))
                ).exists()
                
                if existing_booking:
                    return False
                    
                # Also check if any existing booking overlaps with this slot
                overlapping_bookings = Booking.objects.filter(
                    shop_id=shop_id,
                    appointment_date=date,
                    booking_status__in=['confirmed', 'pending']  # Fixed field name
                )
                
                for booking in overlapping_bookings:
                    booking_duration = self._get_booking_total_duration(booking)
                    booking_end_time = self._add_minutes_to_time(booking.appointment_time, booking_duration)
                    
                    # Check if there's an overlap
                    if (booking.appointment_time <= slot_time < booking_end_time):
                        return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking consecutive slots availability: {e}")
            return False
    
    def _generate_time_slots_with_duration(self, business_hours, selected_date, shop_id, total_duration):
        """Generate time slots considering service duration"""
        slots = []
        
        # Check if business hours has opening and closing times
        if not business_hours.opening_time or not business_hours.closing_time:
            return slots
        
        current_time = business_hours.opening_time
        closing_time = business_hours.closing_time
        slot_duration = timedelta(minutes=30)
        
        # Calculate how many 30-minute slots are needed
        slots_needed = math.ceil(total_duration / 30) if total_duration > 0 else 1
        
        # Get current time if the selected date is today
        now = timezone.now()
        is_today = selected_date == now.date()
        current_hour_minute = now.time() if is_today else None
        
        while current_time < closing_time:
            # Check if there's enough time before closing for the entire service
            service_end_time = self._add_minutes_to_time(current_time, total_duration if total_duration > 0 else 30)
            
            # Skip if service would end after closing time
            if service_end_time > closing_time:
                break
            
            # Check if slot is in the past (for today only)
            is_past_slot = False
            if is_today and current_hour_minute:
                is_past_slot = current_time <= current_hour_minute
            
            # Check if consecutive slots are available
            is_available = self._are_consecutive_slots_available(
                shop_id, 
                selected_date, 
                current_time,
                slots_needed
            ) and not is_past_slot
            
            slots.append({
                'time': current_time.strftime('%H:%M'),
                'end_time': service_end_time.strftime('%H:%M'),
                'available': is_available,
                'is_past': is_past_slot,
                'slots_needed': slots_needed,
                'duration': total_duration if total_duration > 0 else 30
            })
            
            # Add 30 minutes to current time
            current_datetime = datetime.combine(selected_date, current_time)
            current_datetime += slot_duration
            current_time = current_datetime.time()
            
            # Prevent infinite loop
            if len(slots) > 48:
                break
        
        return slots
    
    def _add_minutes_to_time(self, time_obj, minutes):
        """Add minutes to a time object"""
        datetime_obj = datetime.combine(datetime.today(), time_obj)
        datetime_obj += timedelta(minutes=minutes)
        return datetime_obj.time()
    
    def _get_booking_total_duration(self, booking):
        """Calculate total duration of a booking based on its services"""
        total_duration = 0
        for service in booking.services.all():
            total_duration += service.duration_minutes
        return total_duration if total_duration > 0 else 30


class HandlePaymentFailureView(APIView):
    """Handle payment failure"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            data = request.data
            logger.info(f"Payment failure: {data}")
            
            # You can store failed payment attempts in database if needed
            
            return Response({
                'success': True,
                'message': 'Payment failure recorded'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Payment failure handling error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        

from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.views import APIView
from datetime import datetime, date
import logging

from shop.models import Booking, Shop
from shop.serializers import BookingSerializer

# Set up logging
logger = logging.getLogger(__name__)

class ShopBookingsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response({'success': False, 'message': 'Authentication required'}, 
                              status=status.HTTP_401_UNAUTHORIZED)

            # Get shop - handle case where shop doesn't exist
            try:
                shop = Shop.objects.get(user=request.user)
            except Shop.DoesNotExist:
                logger.error(f"Shop not found for user: {request.user.id}")
                return Response({'success': False, 'message': 'Shop not found for this user'}, 
                              status=status.HTTP_404_NOT_FOUND)

            # Get query parameters
            booking_status = request.GET.get('status', None)
            date_filter = request.GET.get('date', None)
            search = request.GET.get('search', None)

            # Start with base queryset - be more careful with related fields
            try:
                bookings = Booking.objects.filter(shop=shop)
                
                # Only add select_related/prefetch_related if the relationships exist
                # Remove or adjust these based on your actual model structure
                bookings = bookings.select_related('user', 'shop')
                # Only uncomment if 'services' relationship exists
                # bookings = bookings.prefetch_related('services')
            except Exception as e:
                logger.error(f"Error building base queryset: {str(e)}")
                return Response({'success': False, 'message': 'Database query error'}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Apply status filter
            if booking_status and booking_status != 'all':
                # Validate status values
                valid_statuses = ['pending', 'confirmed', 'completed', 'cancelled']
                if booking_status in valid_statuses:
                    bookings = bookings.filter(booking_status=booking_status)

            # Apply date filter
            if date_filter:
                try:
                    filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                    bookings = bookings.filter(appointment_date=filter_date)
                except ValueError:
                    logger.warning(f"Invalid date format: {date_filter}")
                    # Don't fail, just skip the filter

            # Apply search filter - be careful about field names
            if search:
                search_filters = Q()
                
                # Check if these fields exist before using them
                try:
                    # Basic user fields that should exist
                    search_filters |= Q(user__username__icontains=search)
                    search_filters |= Q(user__email__icontains=search)
                    
                    # Only add phone if the field exists
                    # Remove this line if your User model doesn't have a phone field
                    # search_filters |= Q(user__phone__icontains=search)
                    
                    # Only add notes if the field exists on Booking model
                    search_filters |= Q(notes__icontains=search)
                    
                    bookings = bookings.filter(search_filters)
                except Exception as e:
                    logger.error(f"Error applying search filters: {str(e)}")
                    # Continue without search filter rather than failing

            # Order results
            try:
                bookings = bookings.order_by('-appointment_date', '-appointment_time')
            except Exception as e:
                logger.error(f"Error ordering bookings: {str(e)}")
                # Use default ordering or no ordering
                bookings = bookings.order_by('-id')

            # Serialize data
            try:
                serializer = BookingSerializer(bookings, many=True)
                booking_data = serializer.data
            except Exception as e:
                logger.error(f"Serialization error: {str(e)}")
                return Response({'success': False, 'message': 'Data serialization error'}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Get count
            try:
                total_count = bookings.count()
            except Exception as e:
                logger.error(f"Error getting booking count: {str(e)}")
                total_count = len(booking_data)

            return Response({
                'success': True,
                'bookings': booking_data,
                'total_count': total_count
            })

        except Exception as e:
            logger.error(f"Unexpected error in ShopBookingsAPIView: {str(e)}", exc_info=True)
            return Response({'success': False, 'message': 'An unexpected error occurred'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BookingStatusUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, booking_id):
        try:
            # Get shop
            try:
                shop = Shop.objects.get(user=request.user)
            except Shop.DoesNotExist:
                return Response({'success': False, 'message': 'Shop not found for this user'}, 
                              status=status.HTTP_404_NOT_FOUND)

            # Get booking
            try:
                booking = Booking.objects.get(id=booking_id, shop=shop)
            except Booking.DoesNotExist:
                return Response({'success': False, 'message': 'Booking not found'}, 
                              status=status.HTTP_404_NOT_FOUND)

            new_status = request.data.get('status')

            # Validate status
            valid_statuses = ['pending', 'confirmed', 'completed', 'cancelled']
            if new_status not in valid_statuses:
                return Response({'success': False, 'message': 'Invalid status'}, 
                              status=status.HTTP_400_BAD_REQUEST)

            # Update status based on value
            try:
                if new_status == 'confirmed':
                    if hasattr(booking, 'mark_confirmed'):
                        booking.mark_confirmed()
                    else:
                        booking.booking_status = new_status
                        booking.save()
                elif new_status == 'completed':
                    if hasattr(booking, 'mark_completed'):
                        booking.mark_completed()
                    else:
                        booking.booking_status = new_status
                        booking.save()
                elif new_status == 'cancelled':
                    if hasattr(booking, 'cancel_booking'):
                        booking.cancel_booking()
                    else:
                        booking.booking_status = new_status
                        booking.save()
                else:
                    booking.booking_status = new_status
                    booking.save()
            except Exception as e:
                logger.error(f"Error updating booking status: {str(e)}")
                return Response({'success': False, 'message': 'Failed to update booking status'}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Serialize updated booking
            try:
                serializer = BookingSerializer(booking)
                return Response({
                    'success': True,
                    'message': f'Booking status updated to {new_status}',
                    'booking': serializer.data
                })
            except Exception as e:
                logger.error(f"Error serializing updated booking: {str(e)}")
                return Response({
                    'success': True,
                    'message': f'Booking status updated to {new_status}',
                    'booking': None
                })

        except Exception as e:
            logger.error(f"Unexpected error in BookingStatusUpdateAPIView: {str(e)}", exc_info=True)
            return Response({'success': False, 'message': 'An unexpected error occurred'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BookingStatsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get shop
            try:
                shop = Shop.objects.get(user=request.user)
            except Shop.DoesNotExist:
                logger.error(f"Shop not found for user: {request.user.id}")
                return Response({'success': False, 'message': 'Shop not found for this user'}, 
                              status=status.HTTP_404_NOT_FOUND)

            today = date.today()

            # Get all stats with individual error handling
            stats = {}
            
            try:
                stats['total'] = Booking.objects.filter(shop=shop).count()
            except Exception as e:
                logger.error(f"Error getting total bookings: {str(e)}")
                stats['total'] = 0

            try:
                stats['pending'] = Booking.objects.filter(shop=shop, booking_status='pending').count()
            except Exception as e:
                logger.error(f"Error getting pending bookings: {str(e)}")
                stats['pending'] = 0

            try:
                stats['confirmed'] = Booking.objects.filter(shop=shop, booking_status='confirmed').count()
            except Exception as e:
                logger.error(f"Error getting confirmed bookings: {str(e)}")
                stats['confirmed'] = 0

            try:
                stats['completed'] = Booking.objects.filter(shop=shop, booking_status='completed').count()
            except Exception as e:
                logger.error(f"Error getting completed bookings: {str(e)}")
                stats['completed'] = 0

            try:
                stats['cancelled'] = Booking.objects.filter(shop=shop, booking_status='cancelled').count()
            except Exception as e:
                logger.error(f"Error getting cancelled bookings: {str(e)}")
                stats['cancelled'] = 0

            try:
                stats['today'] = Booking.objects.filter(shop=shop, appointment_date=today).count()
            except Exception as e:
                logger.error(f"Error getting today's bookings: {str(e)}")
                stats['today'] = 0

            return Response({
                'success': True,
                'stats': stats
            })

        except Exception as e:
            logger.error(f"Unexpected error in BookingStatsAPIView: {str(e)}", exc_info=True)
            return Response({'success': False, 'message': 'An unexpected error occurred'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
