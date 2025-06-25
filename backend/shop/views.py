import datetime
import logging
import jwt
from dateutil.parser import parse

from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import authenticate
from django.db.models import Sum
from django.forms import ValidationError
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _

from rest_framework import status, permissions, generics
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from users.models import CustomUser
from shop.models import (
    Shop, ShopImage, Notification, Service, OTP,
    BusinessHours, Barber, SpecialClosingDay
)
from shop.serializers import (
    CustomTokenObtainPairSerializer,
    ShopForgotPasswordSerializer,
    ShopResetPasswordSerializer,
    ShopSerializer,
    ShopImageSerializer,
    NotificationSerializer,
    ServiceSerializer,
    ShopVerifyForgotPasswordOTPSerializer,
    BusinessHoursSerializer,
    SpecialClosingDaySerializer,
)



logger = logging.getLogger(__name__)



class ShopRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Log the received data for debugging
        logger.debug(f"Received data: {request.data}")
        
        # If the data is structured differently than expected, restructure it
        data = request.data
        if 'user' in data and isinstance(data['user'], dict) and 'shop' in data and isinstance(data['shop'], dict):
            # The frontend is sending nested data, extract and merge it
            user_data = data['user']
            shop_data = data['shop']
            
            # Merge data for the serializer
            serializer_data = {
                'name': shop_data.get('name', ''),
                'email': user_data.get('email', ''),
                'password': user_data.get('password', ''),
                'username': user_data.get('username', ''),
                'phone': shop_data.get('phone', ''),
                'address': shop_data.get('address', ''),
                'description': shop_data.get('description', ''),
                'owner_name': shop_data.get('owner_name', ''),
                'latitude': shop_data.get('latitude'),
                'longitude': shop_data.get('longitude')
            }
        else:
            # Direct data format
            serializer_data = data
        
        # DEBUG: Log coordinate values and their lengths
        lat = serializer_data.get('latitude')
        lng = serializer_data.get('longitude')
        if lat is not None:
            logger.debug(f"Latitude value: {lat}, type: {type(lat)}, length: {len(str(lat))}")
        if lng is not None:
            logger.debug(f"Longitude value: {lng}, type: {type(lng)}, length: {len(str(lng))}")
        
        # Process coordinates to ensure they fit the model constraints
        if lat is not None:
            try:
                # Convert to float first, then to string with limited precision
                lat_float = float(lat)
                # Round to 9 decimal places to fit within 12 total digits
                serializer_data['latitude'] = round(lat_float, 9)
                logger.debug(f"Processed latitude: {serializer_data['latitude']}")
            except (ValueError, TypeError):
                logger.error(f"Invalid latitude value: {lat}")
                return Response(
                    {'detail': 'Invalid latitude value provided.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if lng is not None:
            try:
                # Convert to float first, then to string with limited precision
                lng_float = float(lng)
                # Round to 9 decimal places to fit within 12 total digits
                serializer_data['longitude'] = round(lng_float, 9)
                logger.debug(f"Processed longitude: {serializer_data['longitude']}")
            except (ValueError, TypeError):
                logger.error(f"Invalid longitude value: {lng}")
                return Response(
                    {'detail': 'Invalid longitude value provided.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check if email already exists before passing to serializer
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        email = serializer_data.get('email')
        if email and User.objects.filter(email=email).exists():
            return Response(
                {'detail': 'A user with this email already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Now use the processed data
        serializer = ShopSerializer(data=serializer_data)
        
        if serializer.is_valid():
            try:
                # Save the shop with is_active=False
                shop = serializer.save()
                
                # Generate OTP using the OTP model
                otp_obj = OTP.create_for_shop(shop)
                
                # Send OTP email
                subject = 'Shop Registration Verification'
                message = f'''
                Thank you for registering your shop!
                
                Your verification code is: {otp_obj.otp_code}
                
                This code will expire in 10 minutes.
                
                Please enter this code on the verification page to complete your registration.
                '''
                from_email = settings.DEFAULT_FROM_EMAIL
                recipient_list = [shop.email]
                
                try:
                    send_mail(subject, message, from_email, recipient_list)
                except Exception as e:
                    logger.error(f"Failed to send email: {str(e)}")
                    # If email fails, delete the shop and return error
                    shop.user.delete()  # This will cascade delete the shop
                    return Response(
                        {'detail': f'Failed to send verification email: {str(e)}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                return Response({
                    'success': True,
                    'detail': 'Registration successful. Please verify your email.',
                    'email': shop.email
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"Error during shop registration: {str(e)}")
                return Response(
                    {'detail': f'Registration failed: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            logger.warning(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ShopVerifyOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        otp_code = request.data.get('otp')
        
        # Add detailed logging
        logger.info(f"OTP verification attempt for email: {email} with code: {otp_code}")
        
        if not email or not otp_code:
            return Response(
                {'detail': 'Email and OTP are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            shop = Shop.objects.get(email=email)
            logger.info(f"Found shop with ID: {shop.id}, name: {shop.name}")
        except Shop.DoesNotExist:
            logger.warning(f"No shop found with email: {email}")
            return Response(
                {'detail': 'Shop not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Enhanced debugging for OTP investigation
        from django.utils import timezone
        current_time = timezone.now()
        logger.info(f"Current time: {current_time}")
        
        # Check all OTPs for this shop (including expired ones)
        all_otps = OTP.objects.filter(shop=shop).order_by('-created_at')
        logger.info(f"Total OTPs ever created for shop {shop.id}: {all_otps.count()}")
        
        for i, otp in enumerate(all_otps[:5]):  # Log first 5 OTPs
            is_expired = otp.expires_at < current_time
            logger.info(f"OTP {i+1}: code={otp.otp_code}, created={otp.created_at}, expires={otp.expires_at}, expired={is_expired}")
        
        # Check current active OTPs using the relationship
        active_otps = shop.otps.all()
        otp_count = active_otps.count()
        logger.info(f"Active OTPs using shop.otps relationship: {otp_count}")
        
        if otp_count == 0:
            # Check if there were ever any OTPs created
            total_otps_ever = OTP.objects.filter(shop=shop).count()
            logger.warning(f"No active OTPs found. Total OTPs ever created: {total_otps_ever}")
            
            if total_otps_ever > 0:
                logger.warning("OTPs were created but are no longer active - possibly deleted by cleanup process")
            
            return Response(
                {'non_field_errors': ['No OTP found for this account. Please request a new one.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the latest active OTP
        try:
            otp_obj = active_otps.latest('created_at')
            logger.info(f"Latest active OTP: code={otp_obj.otp_code}, created={otp_obj.created_at}, expires={otp_obj.expires_at}")
            logger.info(f"OTP is_valid() result: {otp_obj.is_valid()}")
        except OTP.DoesNotExist:
            return Response(
                {'non_field_errors': ['No OTP found for this account. Please request a new one.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if OTP is valid and matches
        if not otp_obj.is_valid():
            logger.warning(f"OTP expired. Current time: {current_time}, OTP expires: {otp_obj.expires_at}")
            return Response(
                {'non_field_errors': ['OTP has expired. Please request a new OTP.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Convert input OTP to string and strip whitespace for comparison
        if not isinstance(otp_code, str):
            otp_code = str(otp_code)
        otp_code = otp_code.strip()
        stored_otp = otp_obj.otp_code.strip()
        
        logger.info(f"Comparing OTPs - input: '{otp_code}', stored: '{stored_otp}'")
        
        if otp_code != stored_otp:
            logger.warning(f"OTP mismatch: received '{otp_code}', stored '{stored_otp}'")
            return Response(
                {'non_field_errors': ['Invalid OTP. Please try again.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # OTP is valid and matches
        logger.info(f"OTP verification successful for shop: {shop.id}")
        
        # Activate the user account
        user = shop.user
        user.is_active = True
        user.save()
        
        # Mark email as verified
        shop.is_email_verified = True
        shop.save()
        
        # Delete the used OTP
        otp_obj.delete()
        logger.info(f"OTP deleted successfully for shop: {shop.id}")
        
        return Response(
            {'detail': 'Email verification successful.'},
            status=status.HTTP_200_OK
        )

class ShopResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response({
                'detail': 'Email is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = Shop.objects.get(email=email)
        except Shop.DoesNotExist:
            return Response({
                'detail': 'No shop found with this email.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Generate new OTP
        otp_obj = OTP.create_for_shop(shop)
        
        # Send OTP email
        subject = 'Shop Registration Verification'
        message = f'''
        Your new verification code is: {otp_obj.otp_code}
        
        This code will expire in 10 minutes.
        
        Please enter this code on the verification page to complete your registration.
        '''
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = [shop.email]
        
        try:
            send_mail(subject, message, from_email, recipient_list)
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return Response({
                'detail': 'Failed to send verification email.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'detail': 'New verification code sent to your email.'
        }, status=status.HTTP_200_OK)
    


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role  
        return token


# Updated backend views with fixes

# Updated views.py with fixes

class CustomShopTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        try:
            email = request.data.get("email")
            password = request.data.get("password")

            # Check if user exists
            if not CustomUser.objects.filter(email=email).exists():
                return Response(
                    {"success": False, "message": "User with this account does not exist"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the user and check if they have a shop
            user = CustomUser.objects.get(email=email)
            
            # Check if user is active
            if not user.is_active:
                return Response(
                    {"success": False, "message": "Account is not activated. Please verify your email first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user is a shop owner
            if user.role != 'shop':
                return Response(
                    {"success": False, "message": "This account is not registered as a shop"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if shop exists and is verified
            try:
                shop = Shop.objects.get(user=user)
                if not shop.is_email_verified:
                    return Response(
                        {"success": False, "message": "Please verify your email before logging in"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Shop.DoesNotExist:
                return Response(
                    {"success": False, "message": "Shop profile not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Proceed with authentication
            response = super().post(request, *args, **kwargs)
            token = response.data

            access_token = token["access"]
            refresh_token = token["refresh"]

            res = Response(status=status.HTTP_200_OK)

            res.data = {
                "success": True,
                "message": "Shop login successfully",
                "shopDetails": {
                    "id": shop.id,
                    "name": shop.name,
                    "email": shop.email,
                    "owner_name": shop.owner_name,
                    "is_approved": shop.is_approved,
                    "is_email_verified": shop.is_email_verified
                },
                "userDetails": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role
                }
            }

            # FIXED: Set cookies with root path for all shop routes
            res.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=False,  # Set to True in production with HTTPS
                samesite="Lax",  # Changed from "None" to "Lax" for local development
                path='/',  # FIXED: Use root path instead of specific path
                max_age=3600
            )

            res.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=False,  # Set to True in production with HTTPS
                samesite="Lax",  # Changed from "None" to "Lax" for local development
                path='/',  # FIXED: Use root path instead of specific path
                max_age=86400  # 24 hours for refresh token
            )
            return res

        except AuthenticationFailed:
            return Response(
                {"success": False, "message": "Invalid Credentials"},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomShopTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.COOKIES.get("refresh_token")
            
            if not refresh_token:
                return Response(
                    {"success": False, "message": "Refresh token not found in cookies"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use the serializer directly
            serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
            
            if serializer.is_valid():
                access_token = serializer.validated_data["access"]
                
                # Create success response
                res = Response(
                    {"success": True, "message": "Access token refreshed"},
                    status=status.HTTP_200_OK
                )

                # Set the new access token cookie
                res.set_cookie(
                    key="access_token",
                    value=access_token,
                    httponly=True,
                    secure=False,  # Set to True in production
                    samesite="Lax",
                    path='/',
                    max_age=3600
                )

                return res
            else:
                return Response(
                    {"success": False, "message": "Invalid or expired refresh token"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
        except Exception as e:
            return Response(
                {"success": False, "message": f"Token refresh failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class ShopLogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get tokens from cookies
            access_token = request.COOKIES.get('access_token')
            refresh_token = request.COOKIES.get('refresh_token')
            
            # Blacklist the refresh token if it exists
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                    print(f"Refresh token blacklisted successfully")
                except TokenError as e:
                    # Token might already be blacklisted or invalid
                    print(f"Token blacklist error: {str(e)}")
            
            # Create response
            res = Response(status=status.HTTP_200_OK)
            res.data = {"success": True, "message": "Logged out successfully"}
            
            # Clear cookies with consistent paths
            res.delete_cookie('access_token', path='/')
            res.delete_cookie('refresh_token', path='/')
            
            return res
            
        except Exception as e:
            return Response(
                {"success": False, "message": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

logger = logging.getLogger(__name__)

class ShopProfileView(APIView):
    """View to retrieve the authenticated shop's profile information."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                logger.warning("Unauthenticated user trying to access shop profile")
                return Response(
                    {"success": False, "error": "Authentication required"}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check if user has shop role
            if getattr(request.user, 'role', None) != 'shop':
                logger.warning(f"User {request.user.id} with role {getattr(request.user, 'role', 'None')} trying to access shop profile")
                return Response(
                    {"success": False, "error": "Only shop owners can access this endpoint"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            try:
                shop = Shop.objects.get(user=request.user)
                logger.debug(f"Found shop: {shop.name} for user: {request.user.username}")
                
                serializer = ShopSerializer(shop)
                return Response({
                    "success": True,
                    "data": serializer.data
                })
            except Shop.DoesNotExist:
                logger.error(f"Shop not found for user: {request.user.id}")
                return Response(
                    {"success": False, "error": "Shop profile not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
        except Exception as e:
            logger.error(f"Unexpected error in ShopProfileView: {str(e)}")
            return Response(
                {"success": False, "error": "Internal server error"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ShopUpdateView(APIView):
    """View to update shop details and handle images."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Check if user has shop role
            if getattr(request.user, 'role', None) != 'shop':
                logger.warning(f"User {request.user.id} with role {getattr(request.user, 'role', 'None')} trying to update shop profile")
                return Response(
                    {"success": False, "error": "Only shop owners can access this endpoint"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            shop = get_object_or_404(Shop, user=request.user)
            
            # Update basic shop details
            shop.name = request.data.get('name', shop.name)
            shop.phone = request.data.get('phone', shop.phone)
            shop.owner_name = request.data.get('owner_name', shop.owner_name)
            shop.address = request.data.get('address', shop.address)
            shop.description = request.data.get('description', shop.description)
            shop.save()
            
            # Handle images if provided
            images_data = request.data.get('images', [])
            if images_data:
                # Clear existing images
                ShopImage.objects.filter(shop=shop).delete()
                
                # Add new images
                for index, image_data in enumerate(images_data):
                    ShopImage.objects.create(
                        shop=shop,
                        image_url=image_data.get('url'),
                        public_id=image_data.get('public_id'),
                        width=image_data.get('width'),
                        height=image_data.get('height'),
                        is_primary=(index == 0),  # First image is primary
                        order=index
                    )
            
            # Return updated shop data
            serializer = ShopSerializer(shop)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Shop profile updated successfully'
            })
            
        except Shop.DoesNotExist:
            return Response(
                {"success": False, "error": "Shop profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error in ShopUpdateView: {str(e)}")
            return Response(
                {"success": False, "error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ShopImageAddView(APIView):
    """View to add a new image to shop."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Check if user has shop role
            if getattr(request.user, 'role', None) != 'shop':
                return Response(
                    {"success": False, "error": "Only shop owners can access this endpoint"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            shop = get_object_or_404(Shop, user=request.user)
            
            image_data = request.data
            order = ShopImage.objects.filter(shop=shop).count()
            is_primary = order == 0  # First image is primary
            
            shop_image = ShopImage.objects.create(
                shop=shop,
                image_url=image_data.get('url'),
                public_id=image_data.get('public_id'),
                width=image_data.get('width'),
                height=image_data.get('height'),
                is_primary=is_primary,
                order=order
            )
            
            serializer = ShopImageSerializer(shop_image)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Image added successfully'
            })
            
        except Exception as e:
            logger.error(f"Error in ShopImageAddView: {str(e)}")
            return Response(
                {"success": False, "error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ShopImageRemoveView(APIView):
    """View to remove a shop image."""
    
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, image_id):
        try:
            # Check if user has shop role
            if getattr(request.user, 'role', None) != 'shop':
                return Response(
                    {"success": False, "error": "Only shop owners can access this endpoint"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            shop = get_object_or_404(Shop, user=request.user)
            image = get_object_or_404(ShopImage, id=image_id, shop=shop)
            
            was_primary = image.is_primary
            image.delete()
            
            # If deleted image was primary, make the first remaining image primary
            if was_primary:
                first_image = ShopImage.objects.filter(shop=shop).first()
                if first_image:
                    first_image.is_primary = True
                    first_image.save()
            
            return Response({
                'success': True,
                'message': 'Image removed successfully'
            })
            
        except Exception as e:
            logger.error(f"Error in ShopImageRemoveView: {str(e)}")
            return Response(
                {"success": False, "error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ShopImageSetPrimaryView(APIView):
    """View to set an image as primary."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, image_id):
        try:
            # Check if user has shop role
            if getattr(request.user, 'role', None) != 'shop':
                return Response(
                    {"success": False, "error": "Only shop owners can access this endpoint"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            shop = get_object_or_404(Shop, user=request.user)
            image = get_object_or_404(ShopImage, id=image_id, shop=shop)
            
            # Set all images as non-primary
            ShopImage.objects.filter(shop=shop).update(is_primary=False)
            
            # Set this image as primary
            image.is_primary = True
            image.save()
            
            return Response({
                'success': True,
                'message': 'Primary image updated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error in ShopImageSetPrimaryView: {str(e)}")
            return Response(
                {"success": False, "error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PublicShopDetailView(APIView):
    """Public view to get shop details for users."""
    
    def get(self, request, shop_id):
        try:
            shop = get_object_or_404(Shop, id=shop_id, is_approved=True)
            serializer = ShopSerializer(shop)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Shop.DoesNotExist:
            return Response(
                {"success": False, "error": "Shop not found or not approved"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error in PublicShopDetailView: {str(e)}")
            return Response(
                {"success": False, "error": "Internal server error"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PublicShopListView(APIView):
    """Public view to get all approved shops."""
    
    def get(self, request):
        try:
            shops = Shop.objects.filter(is_approved=True)
            serializer = ShopSerializer(shops, many=True)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Error in PublicShopListView: {str(e)}")
            return Response(
                {"success": False, "error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# class ShopDashboardStatsView(APIView):
#     """View to retrieve shop dashboard statistics."""
    
#     permission_classes = [IsAuthenticated]
    
#     def get(self, request):
#         try:
#             shop = Shop.objects.get(user=request.user)
            
#             # Check if shop is approved
#             if not shop.is_approved:
#                 return Response(
#                     {"error": "Shop is not approved yet"}, 
#                     status=status.HTTP_403_FORBIDDEN
#                 )
            
#             # Get today's date to filter appointments
#             from datetime import datetime, time
#             today = datetime.now().date()
#             today_start = datetime.combine(today, time.min)
#             today_end = datetime.combine(today, time.max)
            
#             # Calculate statistics
#             appointments_today = Appointment.objects.filter(
#                 shop=shop, 
#                 start_time__range=(today_start, today_end)
#             ).count()
            
#             # Calculating total sales (this is a simplified example)
#             total_sales = Appointment.objects.filter(
#                 shop=shop, 
#                 status='completed'
#             ).aggregate(total=Sum('price'))['total'] or 0
            
#             # Count unique customers
#             total_customers = CustomUser.objects.filter(appointments__shop=shop).distinct().count()
            
#             # Count services/products offered by this shop
#             total_services = Service.objects.filter(shop=shop).count()
            
#             stats = {
#                 'appointments_today': appointments_today,
#                 'total_sales': total_sales,
#                 'total_customers': total_customers,
#                 'products': total_services  # Called 'products' to match frontend expectation
#             }
            
#             return Response(stats)
            
#         except Shop.DoesNotExist:
#             return Response(
#                 {"error": "Shop profile not found"}, 
#                 status=status.HTTP_404_NOT_FOUND
#             )


# Shop Data Views
# class RecentAppointmentsView(APIView):
#     """View to retrieve recent appointments for a shop."""
    
#     permission_classes = [IsAuthenticated]
    
#     def get(self, request):
#         try:
#             shop = Shop.objects.get(user=request.user)
#             # Get the most recent appointments (e.g., limited to 5)
#             appointments = Appointment.objects.filter(shop=shop).order_by('-start_time')[:5]
#             serializer = AppointmentSerializer(appointments, many=True)
#             return Response(serializer.data)
#         except Shop.DoesNotExist:
#             return Response(
#                 {"error": "Shop profile not found"}, 
#                 status=status.HTTP_404_NOT_FOUND
#             )


class ShopNotificationsView(APIView):
    """View to retrieve shop notifications."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            shop = Shop.objects.get(user=request.user)
            # Get unread notifications first, then read ones, most recent first
            notifications = Notification.objects.filter(shop=shop).order_by('-read', '-created_at')[:10]
            serializer = NotificationSerializer(notifications, many=True)
            return Response(serializer.data)
        except Shop.DoesNotExist:
            return Response(
                {"error": "Shop profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )


class BusinessHoursView(APIView):
    """API view for business hours operations using DRF."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all business hours for the authenticated user's shop."""
        try:
            shop = request.user.shop
        except Shop.DoesNotExist:
            return Response(
                {'error': 'No shop associated with this user'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get business hours for this specific shop
        hours = BusinessHours.objects.filter(shop=shop)
        serializer = BusinessHoursSerializer(hours, many=True)
        return Response(serializer.data)


class BusinessHoursUpdateView(APIView):
    """API view for updating business hours using DRF."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Update business hours."""
        try:
            # Get the shop associated with the authenticated user
            try:
                shop = request.user.shop
            except Shop.DoesNotExist:
                return Response(
                    {'error': 'No shop associated with this user'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            business_hours = request.data.get('business_hours', [])
            updated_hours = []
            
            for hour_data in business_hours:
                day_of_week = hour_data.get('day_of_week')
                is_closed = hour_data.get('is_closed', False)
                
                if day_of_week is None:
                    continue
                
                # Create defaults dictionary
                defaults = {'is_closed': is_closed}
                
                # Always set default times - even for closed days
                # This ensures NOT NULL constraints are satisfied
                opening_time = hour_data.get('opening_time', '09:00')
                closing_time = hour_data.get('closing_time', '17:00')
                
                try:
                    # Parse time strings - assuming format like "09:00"
                    from datetime import time
                    
                    if isinstance(opening_time, str) and opening_time:
                        hour, minute = map(int, opening_time.split(':'))
                        defaults['opening_time'] = time(hour=hour, minute=minute)
                    else:
                        # Default opening time if not provided or invalid
                        defaults['opening_time'] = time(hour=9, minute=0)
                    
                    if isinstance(closing_time, str) and closing_time:
                        hour, minute = map(int, closing_time.split(':'))
                        defaults['closing_time'] = time(hour=hour, minute=minute)
                    else:
                        # Default closing time if not provided or invalid
                        defaults['closing_time'] = time(hour=17, minute=0)
                except Exception as e:
                    return Response({'error': f'Invalid time format: {str(e)}'}, 
                                   status=status.HTTP_400_BAD_REQUEST)
                
                # Create or update the business hours - NOW INCLUDING THE SHOP
                hours, created = BusinessHours.objects.update_or_create(
                    shop=shop,  # Include the shop in the lookup
                    day_of_week=day_of_week,
                    defaults=defaults
                )
                
                serializer = BusinessHoursSerializer(hours)
                updated_hours.append(serializer.data)
            
            return Response({
                'success': True,
                'message': 'Business hours updated successfully',
                'business_hours': updated_hours
            })
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AvailableSlotsView(APIView):
    """API view for available time slots using DRF."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get available time slots for a specific date."""
        date_str = request.query_params.get('date')
        barber_id = request.query_params.get('barber_id')
        service_id = request.query_params.get('service_id')
        
        if not date_str:
            return Response({'error': 'Date parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            date = parse(date_str).date()
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get selected barber if provided
        barber = None
        if barber_id:
            try:
                barber = Barber.objects.get(id=barber_id)
            except Barber.DoesNotExist:
                return Response({'error': 'Barber not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get service duration if provided
        slot_duration = 30  # Default 30 min
        if service_id:
            try:
                service = Service.objects.get(id=service_id)
                slot_duration = service.duration.total_seconds() // 60  # Convert to minutes
            except Service.DoesNotExist:
                return Response({'error': 'Service not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get available slots
        slots = get_available_slots(date, barber, slot_duration)
        
        # Format slots for response
        formatted_slots = []
        for start, end in slots:
            formatted_slots.append({
                'start_time': start.strftime('%Y-%m-%d %H:%M'),
                'end_time': end.strftime('%Y-%m-%d %H:%M'),
                'display': f"{start.strftime('%H:%M')} - {end.strftime('%H:%M')}"
            })
        
        return Response({
            'date': date.strftime('%Y-%m-%d'),
            'available_slots': formatted_slots
        })


class AppointmentCreateView(APIView):
    """API view for creating appointments using DRF."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create a new appointment."""
        try:
            serializer = AppointmentSerializer(data=request.data)
            if serializer.is_valid():
                # Extract data
                customer_id = serializer.validated_data.get('customer_id')
                barber_id = serializer.validated_data.get('barber_id')
                service_id = serializer.validated_data.get('service_id')
                start_time = serializer.validated_data.get('start_time')
                
                # Get the service for duration
                service = Service.objects.get(id=service_id)
                end_time = start_time + service.duration
                
                # Check if the slot is still available
                date = start_time.date()
                available_slots = get_available_slots(date, Barber.objects.get(id=barber_id))
                
                slot_available = False
                for slot_start, slot_end in available_slots:
                    if slot_start == start_time:
                        slot_available = True
                        break
                
                if not slot_available:
                    return Response({'error': 'This time slot is no longer available'}, 
                                    status=status.HTTP_400_BAD_REQUEST)
                
                # Create the appointment
                appointment = serializer.save(end_time=end_time)
                
                return Response({
                    'success': True,
                    'appointment_id': appointment.id,
                    'start_time': appointment.start_time.strftime('%Y-%m-%d %H:%M'),
                    'end_time': appointment.end_time.strftime('%Y-%m-%d %H:%M')
                }, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SpecialClosingDayView(APIView):
    """API view for managing special closing days using DRF."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all special closing days."""
        closing_days = SpecialClosingDay.objects.all()
        serializer = SpecialClosingDaySerializer(closing_days, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Add a special closing day."""
        try:
            serializer = SpecialClosingDaySerializer(data=request.data)
            if serializer.is_valid():
                closing_day = serializer.save()
                
                return Response({
                    'success': True,
                    'message': 'Special closing day added successfully',
                    'id': closing_day.id,
                    'date': closing_day.date.strftime('%Y-%m-%d'),
                    'reason': closing_day.reason
                }, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SpecialClosingDayDetailView(APIView):
    """API view for managing a specific special closing day using DRF."""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, id):  # Changed from closing_day_id to id
        """Remove a special closing day."""
        try:
            closing_day = get_object_or_404(SpecialClosingDay, id=id)
            closing_day.delete()
            
            return Response({
                'success': True,
                'message': 'Special closing day removed successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        

class ServiceListView(generics.ListAPIView):
    """
    API view for listing all services belonging to the authenticated shop.
    """
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return services belonging to the authenticated user's shop.
        Assumes the authenticated user has a related shop.
        """
        try:
            # If your User model has a direct relationship to Shop
            if hasattr(self.request.user, 'shop'):
                return Service.objects.filter(shop=self.request.user.shop)
            # If the User IS the Shop (your current setup)
            else:
                return Service.objects.filter(shop=self.request.user)
        except AttributeError:
            return Service.objects.none()


class ServiceCreateView(generics.CreateAPIView):
    """
    API view for creating a new service.
    """
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Automatically use the authenticated user as the shop
        # No need to require shop_id from frontend
        try:
            # If your User model has a direct relationship to Shop
            if hasattr(self.request.user, 'shop'):
                shop = self.request.user.shop
            # If the User IS the Shop (your current setup based on other views)
            else:
                shop = self.request.user
                
            serializer.save(shop=shop)
        except AttributeError as e:
            raise ValidationError({"error": "Unable to determine shop for authenticated user"})
        except Exception as e:
            raise ValidationError({"error": "Failed to create service"})


# Complete view class example
class ServiceUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        # Method 1: Direct shop relationship
        try:
            shop = self.request.user.shop
            return Service.objects.filter(shop=shop)
        except Shop.DoesNotExist:
            return Service.objects.none()
    
    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), id=self.kwargs['id'])
        return obj


class ServiceDeleteView(generics.DestroyAPIView):
    """
    API view for deleting an existing service.
    Only allows deleting services belonging to the authenticated shop.
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """
        Return services belonging to the authenticated user (shop) only.
        """
        try:
            shop = self.request.user.shop
            return Service.objects.filter(shop=shop)
        except Shop.DoesNotExist:
            return Service.objects.none()
        
    def get_object(self):
        """
        Override to ensure proper permission checking.
        """
        obj = get_object_or_404(self.get_queryset(), id=self.kwargs['id'])
        self.check_object_permissions(self.request, obj)
        return obj

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"message": "Service deleted successfully"}, status=status.HTTP_200_OK)
    

class ShopForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ShopForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            try:
                send_mail(
                    subject="Your FocusBuddy Password Reset OTP",
                    message=f"Hello {user.name}, your OTP for password reset is {user.otp}",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                return Response({"message": "OTP has been sent to your email"}, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Failed to send OTP email: {str(e)}")
                return Response(
                    {"error": "Failed to send OTP email. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ShopVerifyForgotPasswordOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ShopVerifyForgotPasswordOTPSerializer(data=request.data)
        if serializer.is_valid():
            return Response({"message": "OTP verified successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ShopResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ShopResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
