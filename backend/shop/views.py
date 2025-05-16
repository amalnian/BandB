import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import authenticate

from .models import Shop, OTP
from .serializers import ShopSerializer


from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.views import TokenViewBase
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication



from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenVerifyView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.shortcuts import get_object_or_404
from shop.models import Shop, Appointment, Notification, Service
from .serializers import (
    ShopUpdateSerializer, 
    AppointmentSerializer, 
    NotificationSerializer
)



logger = logging.getLogger(__name__)

class ShopRegisterView(APIView):
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
                'owner_name': shop_data.get('owner_name', '')
            }
        else:
            # Direct data format
            serializer_data = data
        
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
    def post(self, request):
        email = request.data.get('email')
        otp_code = request.data.get('otp')

        if not email or not otp_code:
            return Response(
                {'detail': 'Email and OTP are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            shop = Shop.objects.get(email=email)
        except Shop.DoesNotExist:
            return Response(
                {'detail': 'Shop not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get the latest OTP for this shop
        try:
            otp_obj = shop.otps.latest('created_at')
        except OTP.DoesNotExist:
            return Response(
                {'detail': 'No OTP found. Please request a new OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if OTP is valid and matches
        if otp_obj.is_valid() and otp_obj.otp_code == otp_code:
            # Activate the user account
            user = shop.user
            user.is_active = True
            user.save()

            # Mark email as verified
            shop.is_email_verified = True
            shop.save()

            # Delete the used OTP
            otp_obj.delete()

            return Response(
                {'detail': 'Email verification successful.'},
                status=status.HTTP_200_OK
            )
        else:
            if not otp_obj.is_valid():
                return Response(
                    {'detail': 'OTP has expired. Please request a new OTP.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                return Response(
                    {'detail': 'Invalid OTP.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

class ShopResendOTPView(APIView):
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

class ShopLoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        # Authenticate with the CustomUser model
        user = authenticate(username=email, password=password)
        
        if not user:
            return Response(
                {'detail': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Try to get the associated shop
        try:
            shop = user.shop
        except Shop.DoesNotExist:
            return Response(
                {'detail': 'User is not associated with a shop.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if user/shop is active (email verified)
        if not user.is_active:
            return Response(
                {'detail': 'Email not verified. Please verify your email first.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate tokens for the user
        refresh = RefreshToken.for_user(user)
        
        # Serialize shop data
        serializer = ShopSerializer(shop)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'shop_data': serializer.data
        }, status=status.HTTP_200_OK)

class ShopDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get shop associated with authenticated user
            try:
                shop = request.user.shop
            except Shop.DoesNotExist:
                return Response(
                    {'detail': 'User is not associated with a shop.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Calculate stats (these would be replaced with actual queries)
            stats = {
                'appointments_today': 5,  # Replace with actual calculations
                'total_sales': 1250,
                'total_customers': 42,
                'products': 16
            }
            
            return Response(stats, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': f'Error fetching dashboard stats: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class TokenVerifyView(APIView):
    """
    Takes a token and verifies its validity
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        token = request.data.get('token')
        
        if not token:
            return Response(
                {"detail": "No token provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Try to decode the token
            AccessToken(token)
            
            # If no exception was raised, token is valid
            return Response({"valid": True}, status=status.HTTP_200_OK)
            
        except TokenError:
            return Response(
                {"valid": False, "detail": "Token is invalid or expired"},
                status=status.HTTP_401_UNAUTHORIZED
            )
            










class ShopProfileView(APIView):
    """
    View to retrieve the authenticated shop's profile information.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Assuming we have a one-to-one relationship between User and Shop models
        try:
            shop = Shop.objects.get(user=request.user)
            serializer = ShopProfileSerializer(shop)
            return Response(serializer.data)
        except Shop.DoesNotExist:
            return Response(
                {"error": "Shop profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )


class ShopUpdateView(APIView):
    """
    View to update shop details.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            shop = Shop.objects.get(user=request.user)
            serializer = ShopUpdateSerializer(shop, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                return Response(
                    serializer.errors, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Shop.DoesNotExist:
            return Response(
                {"error": "Shop profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )


class TokenRefreshView(APIView):
    """
    View to refresh an authentication token.
    """
    def post(self, request):
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            refresh = RefreshToken(refresh_token)
            data = {
                'access': str(refresh.access_token),
            }
            
            return Response(data)
        except TokenError as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_401_UNAUTHORIZED
            )


class RecentAppointmentsView(APIView):
    """
    View to retrieve recent appointments for a shop.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            shop = Shop.objects.get(user=request.user)
            # Get the most recent appointments (e.g., limited to 5)
            appointments = Appointment.objects.filter(shop=shop).order_by('-scheduled_time')[:5]
            serializer = AppointmentSerializer(appointments, many=True)
            return Response(serializer.data)
        except Shop.DoesNotExist:
            return Response(
                {"error": "Shop profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )


class ShopNotificationsView(APIView):
    """
    View to retrieve shop notifications.
    """
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


class ShopDashboardStatsView(APIView):
    """
    View to retrieve shop dashboard statistics.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            shop = Shop.objects.get(user=request.user)
            
            # Check if shop is approved
            if not shop.is_approved:
                return Response(
                    {"error": "Shop is not approved yet"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get today's date to filter appointments
            from datetime import datetime, time
            today = datetime.now().date()
            today_start = datetime.combine(today, time.min)
            today_end = datetime.combine(today, time.max)
            
            # Calculate statistics
            appointments_today = Appointment.objects.filter(
                shop=shop, 
                scheduled_time__range=(today_start, today_end)
            ).count()
            
            # Calculating total sales (this is a simplified example)
            # In a real app, you might sum up completed appointment values or order totals
            total_sales = Appointment.objects.filter(
                shop=shop, 
                status='completed'
            ).aggregate(total=Sum('price'))['total'] or 0
            
            # Count unique customers
            total_customers = Customer.objects.filter(appointments__shop=shop).distinct().count()
            
            # Count services/products offered by this shop
            total_services = Service.objects.filter(shop=shop).count()
            
            stats = {
                'appointments_today': appointments_today,
                'total_sales': total_sales,
                'total_customers': total_customers,
                'products': total_services  # Called 'products' to match frontend expectation
            }
            
            return Response(stats)
            
        except Shop.DoesNotExist:
            return Response(
                {"error": "Shop profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )


class ShopLogoutView(APIView):
    """
    View to logout (blacklist the refresh token).
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )