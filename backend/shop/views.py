import datetime
import logging
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import authenticate
from django.db.models import Sum
from django.forms import ValidationError
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.exceptions import AuthenticationFailed
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.views import TokenViewBase
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from users.models import CustomUser
from shop.models import Shop, Appointment, Notification, Service, OTP
from shop.serializers import (
    CustomTokenObtainPairSerializer,
    ShopSerializer,
    ShopUpdateSerializer,
    # ShopProfileSerializer,
    AppointmentSerializer,
    NotificationSerializer,
    ServiceSerializer
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
    

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import Shop, CustomUser


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role  
        return token


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
            
            # Check if user is a shop owner
            if user.role != 'shop':
                return Response(
                    {"success": False, "message": "This account is not registered as a shop"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if shop exists
            try:
                shop = Shop.objects.get(user=user)
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

            res.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=True,
                samesite="None",
                path='/shop/dashboard',
                max_age=3600
            )

            res.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=True,
                samesite="None",
                path='/shop/dashboard',
                max_age=3600
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
                    {"success": False, "message": "Refresh token not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Modify request data to include refresh token
            request.data._mutable = True  # Make QueryDict mutable
            request.data["refresh"] = refresh_token

            response = super().post(request, *args, **kwargs)

            if "access" not in response.data:
                return Response(
                    {"success": False, "message": "Refresh token expired or invalid"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            token = response.data
            access_token = token["access"]
            res = Response(status=status.HTTP_200_OK)

            res.data = {"success": True, "message": "Access token refreshed"}

            res.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=True,
                samesite="None",
                path='/shop/dashboard',
                max_age=3600
            )

            return res
            
        except Exception as e:
            return Response(
                {"success": False, "message": f"An error occurred: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


# Optional: Shop logout view to clear cookies
class ShopLogoutView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        try:
            res = Response(status=status.HTTP_200_OK)
            res.data = {"success": True, "message": "Logged out successfully"}
            
            # Clear cookies
            res.delete_cookie('access_token', path='/shop/dashboard')
            res.delete_cookie('refresh_token', path='/shop/dashboard')
            
            return res
            
        except Exception as e:
            return Response(
                {"success": False, "message": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Shop Profile and Management Views
class ShopProfileView(APIView):
    """View to retrieve the authenticated shop's profile information."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Assuming we have a one-to-one relationship between User and Shop models
        try:
            shop = Shop.objects.get(user=request.user)
            serializer = ShopSerializer(shop)
            return Response(serializer.data)
        except Shop.DoesNotExist:
            return Response(
                {"error": "Shop profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )


class ShopUpdateView(APIView):
    """View to update shop details."""
    
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


class ShopDashboardStatsView(APIView):
    """View to retrieve shop dashboard statistics."""
    
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
                start_time__range=(today_start, today_end)
            ).count()
            
            # Calculating total sales (this is a simplified example)
            total_sales = Appointment.objects.filter(
                shop=shop, 
                status='completed'
            ).aggregate(total=Sum('price'))['total'] or 0
            
            # Count unique customers
            total_customers = CustomUser.objects.filter(appointments__shop=shop).distinct().count()
            
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


# Shop Data Views
class RecentAppointmentsView(APIView):
    """View to retrieve recent appointments for a shop."""
    
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
        





from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from dateutil.parser import parse

from .models import (
    BusinessHours, Barber, Service, Appointment, SpecialClosingDay,
    get_available_slots
)
from shop.serializers import (
    BusinessHoursSerializer,
    AppointmentSerializer,
    SpecialClosingDaySerializer
)


class BusinessHoursView(APIView):
    """API view for business hours operations using DRF."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all business hours."""
        hours = BusinessHours.objects.all()
        serializer = BusinessHoursSerializer(hours, many=True)
        return Response(serializer.data)


class BusinessHoursUpdateView(APIView):
    """API view for updating business hours using DRF."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Update business hours."""
        try:
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
                
                # Create or update the business hours
                hours, created = BusinessHours.objects.update_or_create(
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
    
    def delete(self, request, closing_day_id):
        """Remove a special closing day."""
        try:
            closing_day = get_object_or_404(SpecialClosingDay, id=closing_day_id)
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
        Return services belonging to the authenticated user (shop).
        """
        return Service.objects.filter(shop=self.request.user)


class ServiceCreateView(generics.CreateAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Get shop_id from request data
        shop_id = self.request.data.get('shop_id')
        if not shop_id:
            raise ValidationError("shop_id is required")
            
        try:
            shop = Shop.objects.get(id=shop_id)
            serializer.save(shop=shop)
        except Shop.DoesNotExist:
            raise ValidationError("Shop not found")


class ServiceUpdateView(generics.UpdateAPIView):
    """
    API view for updating an existing service.
    Only allows updating services belonging to the authenticated shop.
    """
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return services belonging to the authenticated user (shop) only.
        """
        return Service.objects.filter(shop=self.request.user)


class ServiceDeleteView(generics.DestroyAPIView):
    """
    API view for deleting an existing service.
    Only allows deleting services belonging to the authenticated shop.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return services belonging to the authenticated user (shop) only.
        """
        return Service.objects.filter(shop=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    


