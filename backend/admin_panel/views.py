# views.py

from django.conf import settings
from django.utils import timezone

from rest_framework import (
    viewsets, status, permissions, filters
)
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from django_filters.rest_framework import DjangoFilterBackend

import jwt

# App imports
from users.models import CustomUser
from shop.models import Booking, Shop, ShopCommissionPayment
from users.serializers import (
    AdminUserSerializer,
    CustomTokenObtainPairSerializer,
    UserStatusSerializer
)
from admin_panel.serializers import AdminShopSerializer



class AdminTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            email = request.data.get("email")
            password = request.data.get("password")

            if not CustomUser.objects.filter(email=email).exists():
                return Response(
                    {"success": False, "message": "Admin account does not exist"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = CustomUser.objects.get(email=email)

            # Check if user is active
            if not user.is_active:
                return Response(
                    {"success": False, "message": "Account is inactive"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not user.is_superuser:
                return Response(
                    {"success": False, "message": "User is not an admin"},
                    status=status.HTTP_403_FORBIDDEN
                )

            response = super().post(request, *args, **kwargs)
            token = response.data

            access_token = token["access"]
            refresh_token = token["refresh"]

            res = Response(status=status.HTTP_200_OK)
            res.data = {
                "success": True,
                "message": "Admin login successful",
                "userDetails": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                }
            }

            # Environment-aware cookie settings
            is_production = getattr(settings, 'DEBUG', True) == False
            
            res.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=is_production,  # True in production, False in development
                samesite="None" if is_production else "Lax",  # None for production, Lax for development
                path='/',
                max_age=3600  # 1 hour
            )

            res.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=is_production,  # True in production, False in development
                samesite="None" if is_production else "Lax",  # None for production, Lax for development
                path='/',
                max_age=86400  # 24 hours - FIXED: was 3600 (1 hour)
            )

            return res

        except AuthenticationFailed:
            return Response(
                {"success": False, "message": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.COOKIES.get("refresh_token")
            if not refresh_token:
                return Response(
                    {"success": False, "message": "Refresh token not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use the serializer with proper error handling for token rotation
            serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
            
            try:
                serializer.is_valid(raise_exception=True)
                validated_data = serializer.validated_data
                
                access_token = validated_data["access"]
                new_refresh_token = validated_data.get("refresh")  # May be None if rotation disabled
                
                res = Response(
                    {"success": True, "message": "Access token refreshed"},
                    status=status.HTTP_200_OK
                )

                # Environment-aware cookie settings
                is_production = getattr(settings, 'DEBUG', True) == False

                # Set new access token
                res.set_cookie(
                    key="access_token",
                    value=access_token,
                    httponly=True,
                    secure=is_production,
                    samesite="None" if is_production else "Lax",
                    path='/',
                    max_age=3600
                )
                
                # Update refresh token cookie if we got a new one (token rotation)
                if new_refresh_token:
                    res.set_cookie(
                        key="refresh_token",
                        value=new_refresh_token,
                        httponly=True,
                        secure=is_production,
                        samesite="None" if is_production else "Lax",
                        path='/',
                        max_age=86400  # 24 hours
                    )

                return res
                
            except ValidationError as ve:
                # Handle token validation errors
                error_detail = ve.detail
                if isinstance(error_detail, dict):
                    refresh_errors = error_detail.get('refresh', [])
                    if any('blacklisted' in str(error).lower() for error in refresh_errors):
                        return Response(
                            {"success": False, "message": "Session expired. Please login again."},
                            status=status.HTTP_401_UNAUTHORIZED
                        )
                
                return Response(
                    {"success": False, "message": "Invalid or expired refresh token"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
        except Exception as e:
            return Response(
                {"success": False, "message": f"Token refresh failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
class Logout(APIView):
    permission_classes = [IsAdminUser]
    
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
                    print(f"Admin refresh token blacklisted successfully")
                except TokenError as e:
                    # Token might already be blacklisted or invalid
                    print(f"Admin token blacklist error: {str(e)}")
            
            # Create response
            res = Response(status=status.HTTP_200_OK)
            res.data = {"success": True, "message": "logout successfully"}
            
            # Delete cookies
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
            return Response(
                {"success": False, "message": f"Logout failed: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsAdminUser(permissions.BasePermission):
    """
    Permission to only allow access to admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class AdminShopViewSet(viewsets.ModelViewSet):
    """
    API endpoint for admin to manage all shops
    """
    queryset = Shop.objects.all().order_by('name')
    serializer_class = AdminShopSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'email', 'phone', 'address']
    filterset_fields = ['is_approved', 'is_email_verified']
    
    def list(self, request, *args, **kwargs):
        """Override list method to add debugging"""
        try:
            print(f"Admin shop list request from user: {request.user}")
            print(f"Request params: {request.query_params}")
            
            # Check if user is admin
            if not request.user.is_staff:
                return Response({'error': 'Admin access required'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            return super().list(request, *args, **kwargs)
        except Exception as e:
            print(f"Error in AdminShopViewSet.list: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_queryset(self):
        try:
            queryset = super().get_queryset()
            
            # Allow filtering by is_active (which is actually on the User model)
            is_active = self.request.query_params.get('is_active')
            if is_active is not None:
                is_active = is_active.lower() == 'true'
                queryset = queryset.filter(user__is_active=is_active)
                
            print(f"Filtered queryset count: {queryset.count()}")
            return queryset
        except Exception as e:
            print(f"Error in get_queryset: {str(e)}")
            raise
    
    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        """Toggle the shop's active status"""
        shop = self.get_object()
        
        # Get the is_active value from the request data
        is_active = request.data.get('is_active')
        if is_active is None:
            return Response({'error': 'is_active parameter is required'}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Update the shop's user active status
        try:
            shop.user.is_active = is_active
            shop.user.save()
            return Response({'status': 'Shop status updated', 'is_active': is_active})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        """Approve a shop"""
        shop = self.get_object()
        
        # Get the is_approved value from the request data
        is_approved = request.data.get('is_approved')
        if is_approved is None:
            return Response({'error': 'is_approved parameter is required'}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Update the shop's approved status
        try:
            shop.is_approved = is_approved
            shop.save()
            return Response({'status': 'Shop approval status updated', 'is_approved': is_approved})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing user instances by admins.
    """
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        """Return all users"""
        return CustomUser.objects.all().filter(role = 'user', is_staff=False).order_by('-date_joined')
    
    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        """Toggle the user's active status"""
        user = self.get_object()
        serializer = UserStatusSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                serializer.update(user, serializer.validated_data)
                return Response({'status': 'User status updated'})
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminStatusView(APIView):
    """
    Verify if the current user has admin privileges
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Check if user is admin and return appropriate status"""
        is_admin = request.user.is_staff or request.user.role == 'admin'
        return Response({
            'is_admin': is_admin,
            'role': request.user.role
        })


class DashboardStatsView(APIView):
    """
    Provide statistics for the admin dashboard
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Return basic stats for dashboard"""
        total_users = CustomUser.objects.count()
        active_users = CustomUser.objects.filter(is_active=True).count()
        
        # Shop statistics
        total_shops = Shop.objects.count()
        active_shops = Shop.objects.filter(user__is_active=True).count()
        pending_shops = Shop.objects.filter(is_approved=False).count()
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'new_users_this_month': CustomUser.objects.filter(
                date_joined__month=timezone.now().month,
                date_joined__year=timezone.now().year
            ).count(),
            'total_shops': total_shops,
            'active_shops': active_shops,
            'pending_shops': pending_shops
        })


class RecentAppointmentsView(APIView):
    """
    Provide recent appointments for admin dashboard 
    (You'll need to implement this based on your Appointment model)
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        # This is just a placeholder - implement based on your actual Appointment model
        return Response({
            'appointments': []
        })
    
















from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth.hashers import check_password
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
import re


class AdminProfileView(APIView):
    """
    Get and update admin profile information
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current admin profile"""
        try:
            user = request.user
            
            # Check if user is admin/staff
            if not (user.is_staff or user.is_superuser):
                return Response(
                    {'error': 'Access denied. Admin privileges required.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            profile_data = {
                'username': user.username,
                'email': user.email,
                'phone': user.phone or '',
            }
            
            return Response(profile_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch profile data: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request):
        """Update admin profile"""
        try:
            user = request.user
            
            # Check if user is admin/staff
            if not (user.is_staff or user.is_superuser):
                return Response(
                    {'error': 'Access denied. Admin privileges required.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            data = request.data
            errors = {}
            
            # Validate required fields
            if not data.get('username', '').strip():
                errors['username'] = 'Username is required'
            elif data.get('username') != user.username:
                # Check if username already exists - use CustomUser instead of User
                from django.contrib.auth import get_user_model
                User = get_user_model()
                if User.objects.filter(username=data.get('username')).exclude(id=user.id).exists():
                    errors['username'] = 'Username already exists'
            
            if not data.get('email', '').strip():
                errors['email'] = 'Email is required'
            else:
                # Validate email format
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, data.get('email')):
                    errors['email'] = 'Email is invalid'
                elif data.get('email') != user.email:
                    # Check if email already exists
                    User = get_user_model()
                    if User.objects.filter(email=data.get('email')).exclude(id=user.id).exists():
                        errors['email'] = 'Email already exists'
            
            # Validate phone if provided (using the regex from CustomUser model)
            phone = data.get('phone', '').strip()
            if phone:
                phone_pattern = r'^\+?1?\d{9,15}$'  # Match the CustomUser regex
                if not re.match(phone_pattern, phone):
                    errors['phone'] = "Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
            
            if errors:
                return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update user data
            with transaction.atomic():
                user.username = data.get('username').strip()
                user.email = data.get('email').strip()
                
                # Update phone if provided
                if phone is not None:
                    user.phone = phone
                
                user.save()
            
            # Return updated profile data
            updated_profile = {
                'username': user.username,
                'email': user.email,
                'phone': user.phone or '',
            }
            
            return Response(updated_profile, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to update profile: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminChangePasswordView(APIView):
    """
    Change admin password
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Change admin password"""
        try:
            user = request.user
            
            # Check if user is admin/staff
            if not (user.is_staff or user.is_superuser):
                return Response(
                    {'error': 'Access denied. Admin privileges required.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            data = request.data
            errors = {}
            
            current_password = data.get('current_password', '')
            new_password = data.get('new_password', '')
            
            # Validate current password
            if not current_password:
                errors['current_password'] = 'Current password is required'
            elif not check_password(current_password, user.password):
                errors['current_password'] = 'Current password is incorrect'
            
            # Validate new password
            if not new_password:
                errors['new_password'] = 'New password is required'
            else:
                try:
                    validate_password(new_password, user)
                except ValidationError as e:
                    errors['new_password'] = list(e.messages)[0]
            
            # Check if new password is same as current
            if new_password and current_password and new_password == current_password:
                errors['new_password'] = 'New password must be different from current password'
            
            if errors:
                return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update password
            user.set_password(new_password)
            user.save()
            
            return Response(
                {'message': 'Password changed successfully'}, 
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {'error': f'Failed to change password: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        








# admin_views.py
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal
import calendar

# Import your models - CRITICAL: Make sure these imports are correct
# from .models import BookingFeedback  # Add this if you have this model

import logging
logger = logging.getLogger(__name__)


class AdminDashboardStatsView(APIView):
    """Get overall dashboard statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get date range from query params (default to last 30 days)
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=30)
            
            if request.GET.get('start_date'):
                start_date = datetime.strptime(request.GET.get('start_date'), '%Y-%m-%d').date()
            if request.GET.get('end_date'):
                end_date = datetime.strptime(request.GET.get('end_date'), '%Y-%m-%d').date()

            # Base queryset for paid bookings
            paid_bookings = Booking.objects.filter(
                payment_status='paid',
                created_at__date__range=[start_date, end_date]
            )

            # Calculate total revenue and admin commission
            total_revenue = paid_bookings.aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            admin_commission = total_revenue * Decimal('0.10')  # 10% commission
            shop_earnings = total_revenue - admin_commission

            # Booking statistics
            total_bookings = Booking.objects.count()
            completed_bookings = paid_bookings.filter(booking_status='completed').count()
            cancelled_bookings = Booking.objects.filter(
                booking_status='cancelled',
                created_at__date__range=[start_date, end_date]
            ).count()

            # Calculate completion rate
            completion_rate = (completed_bookings / total_bookings * 100) if total_bookings > 0 else 0

            # Active shops count
            active_shops = Shop.objects.filter(
                booking__payment_status='paid',
                booking__created_at__date__range=[start_date, end_date]
            ).distinct().count()

            # Top performing shops
            top_shops = Shop.objects.filter(
                booking__payment_status='paid',
                booking__created_at__date__range=[start_date, end_date]
            ).annotate(
                total_revenue=Sum('booking__total_amount'),
                total_bookings=Count('booking')
            ).order_by('-total_revenue')[:5]

            top_shops_data = []
            for shop in top_shops:
                shop_commission = shop.total_revenue * Decimal('0.10')
                top_shops_data.append({
                    'id': shop.id,
                    'name': shop.name,
                    'total_revenue': float(shop.total_revenue),
                    'admin_commission': float(shop_commission),
                    'shop_earnings': float(shop.total_revenue - shop_commission),
                    'total_bookings': shop.total_bookings
                })

            return Response({
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date
                },
                'financial_stats': {
                    'total_revenue': float(total_revenue),
                    'admin_commission': float(admin_commission),
                    'shop_earnings': float(shop_earnings),
                    'commission_rate': 10.0
                },
                'booking_stats': {
                    'total_bookings': total_bookings,
                    'completed_bookings': completed_bookings,
                    'cancelled_bookings': cancelled_bookings,
                    'completion_rate': round(completion_rate, 2)
                },
                'general_stats': {
                    'active_shops': active_shops,
                    'top_shops': top_shops_data
                }
            })

        except Exception as e:
            logger.error(f"Error in AdminDashboardStatsView: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminRevenueChartView(APIView):
    """Get revenue data for charts"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get chart type (daily, weekly, monthly)
            chart_type = request.GET.get('type', 'daily')
            
            # Get date range
            end_date = timezone.now().date()
            
            if chart_type == 'daily':
                start_date = end_date - timedelta(days=30)
            elif chart_type == 'weekly':
                start_date = end_date - timedelta(weeks=12)
            else:  # monthly
                start_date = end_date - timedelta(days=365)

            # Get bookings data grouped by date
            bookings = Booking.objects.filter(
                payment_status='paid',
                created_at__date__range=[start_date, end_date]
            ).values('created_at__date').annotate(
                daily_revenue=Sum('total_amount'),
                daily_bookings=Count('id')
            ).order_by('created_at__date')

            # Process data for chart
            chart_data = []
            for booking in bookings:
                date = booking['created_at__date']
                revenue = float(booking['daily_revenue'])
                admin_commission = revenue * 0.10
                
                if chart_type == 'daily':
                    label = date.strftime('%Y-%m-%d')
                elif chart_type == 'weekly':
                    label = f"Week {date.strftime('%W')}, {date.year}"
                else:  # monthly
                    label = date.strftime('%B %Y')
                
                chart_data.append({
                    'date': label,
                    'total_revenue': revenue,
                    'admin_commission': admin_commission,
                    'shop_earnings': revenue - admin_commission,
                    'bookings_count': booking['daily_bookings']
                })

            return Response({
                'chart_type': chart_type,
                'data': chart_data
            })

        except Exception as e:
            logger.error(f"Error in AdminRevenueChartView: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminShopsPerformanceView(APIView):
    """Get shops performance data"""
    permission_classes = [IsAuthenticated]
    
    def get_shop_email(self, shop):
        """Get shop email - it's automatically set from user's email"""
        return shop.email or 'N/A'
    
    def get(self, request):
        try:
            logger.info("AdminShopsPerformanceView called")
            
            # Get date range
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=30)
            
            if request.GET.get('start_date'):
                try:
                    start_date = datetime.strptime(request.GET.get('start_date'), '%Y-%m-%d').date()
                except ValueError as e:
                    logger.error(f"Invalid start_date format: {e}")
                    return Response(
                        {'error': 'Invalid start_date format. Use YYYY-MM-DD'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            if request.GET.get('end_date'):
                try:
                    end_date = datetime.strptime(request.GET.get('end_date'), '%Y-%m-%d').date()
                except ValueError as e:
                    logger.error(f"Invalid end_date format: {e}")
                    return Response(
                        {'error': 'Invalid end_date format. Use YYYY-MM-DD'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

            logger.info(f"Date range: {start_date} to {end_date}")

            # Get shops with their performance data
            try:
                shops_with_bookings = Shop.objects.filter(
                    booking__payment_status='paid',
                    booking__created_at__date__gte=start_date,
                    booking__created_at__date__lte=end_date
                ).distinct().select_related('user')
                
                logger.info(f"Shops with bookings: {shops_with_bookings.count()}")
            except Exception as shop_error:
                logger.error(f"Error querying shops: {shop_error}")
                return Response(
                    {'error': f'Shop query error: {str(shop_error)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            shops_data = []
            for shop in shops_with_bookings:
                try:
                    logger.info(f"Processing shop: {shop.id} - {shop.name}")
                    
                    # Calculate stats for each shop individually
                    shop_bookings = Booking.objects.filter(
                        shop=shop,
                        payment_status='paid',
                        booking_status='completed',
                        created_at__date__gte=start_date,
                        created_at__date__lte=end_date
                    )
                    
                    # Check if total_amount field exists, if not try amount or price
                    total_revenue = Decimal('0.00')
                    try:
                        total_revenue = shop_bookings.aggregate(
                            total=Sum('total_amount')
                        )['total'] or Decimal('0.00')
                    except Exception:
                        # Try alternative field names
                        try:
                            total_revenue = shop_bookings.aggregate(
                                total=Sum('amount')
                            )['total'] or Decimal('0.00')
                        except Exception:
                            try:
                                total_revenue = shop_bookings.aggregate(
                                    total=Sum('price')
                                )['total'] or Decimal('0.00')
                            except Exception:
                                logger.warning(f"Could not find amount field for shop {shop.id}")
                                total_revenue = Decimal('0.00')
                    
                    total_bookings = shop_bookings.count()
                    
                    # Check if booking_status field exists
                    completed_bookings = 0
                    try:
                        completed_bookings = shop_bookings.filter(booking_status='completed').count()
                    except Exception:
                        # Try alternative field names
                        try:
                            completed_bookings = shop_bookings.filter(status='completed').count()
                        except Exception:
                            logger.warning(f"Could not find booking status field for shop {shop.id}")
                            completed_bookings = 0
                    
                    admin_commission = float(total_revenue * Decimal('0.10'))
                    completion_rate = (completed_bookings / total_bookings * 100) if total_bookings > 0 else 0
                    shop_earnings = float(total_revenue) - admin_commission
                    
                    # Calculate total payments made to this shop
                    try:
                        total_payments = ShopCommissionPayment.objects.filter(
                            shop=shop,
                            status='paid'
                        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                        total_payments = float(total_payments)
                    except Exception as payment_error:
                        logger.warning(f"Error calculating payments for shop {shop.id}: {payment_error}")
                        total_payments = 0.00
                    
                    # Calculate remaining earnings
                    remaining_earnings = shop_earnings - total_payments
                    
                    # Calculate average rating using the shop's method
                    average_rating = 0
                    try:
                        rating = shop.get_average_rating()
                        average_rating = float(rating) if rating else 0
                    except Exception as rating_error:
                        logger.warning(f"Error getting rating for shop {shop.id}: {rating_error}")
                        # Fallback: Try to get rating from reviews directly
                        try:
                            reviews = shop.reviews.all()
                            if reviews.exists():
                                total_rating = sum(review.rating for review in reviews)
                                average_rating = total_rating / reviews.count()
                        except Exception:
                            average_rating = 0
                    
                    # Get owner name - prioritize owner_name field, then user info
                    owner_name = 'N/A'
                    try:
                        if shop.owner_name:
                            owner_name = shop.owner_name
                        elif shop.user:  # Make sure shop.user exists
                            # Try to get full name from user
                            if hasattr(shop.user, 'get_full_name'):
                                full_name = shop.user.get_full_name()
                                if full_name and full_name.strip():
                                    owner_name = full_name
                                else:
                                    owner_name = shop.user.username
                            else:
                                owner_name = shop.user.username
                    except Exception as owner_error:
                        logger.warning(f"Error getting owner name for shop {shop.id}: {owner_error}")
                        owner_name = 'N/A'
                    
                    shops_data.append({
                        'id': shop.id,
                        'name': shop.name,
                        'owner_name': owner_name,
                        'total_revenue': float(total_revenue),
                        'admin_commission': admin_commission,
                        'shop_earnings': shop_earnings,
                        'total_payments': total_payments,
                        'remaining_earnings': remaining_earnings,
                        'total_bookings': total_bookings,
                        'completed_bookings': completed_bookings,
                        'completion_rate': round(completion_rate, 2),
                        'average_rating': round(average_rating, 2),
                        'location': shop.address or 'N/A',
                        'phone': shop.phone or 'N/A',
                        'email': self.get_shop_email(shop)
                    })
                    
                except Exception as shop_error:
                    logger.error(f"Error processing shop {shop.id}: {shop_error}")
                    # Continue with next shop instead of breaking
                    continue

            # Sort by total revenue
            shops_data.sort(key=lambda x: x['total_revenue'], reverse=True)

            logger.info(f"Successfully processed {len(shops_data)} shops")

            return Response({
                'date_range': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d')
                },
                'shops': shops_data,
                'total_shops': len(shops_data)
            })

        except Exception as e:
            logger.error(f"Error in AdminShopsPerformanceView: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Internal server error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminRecentBookingsView(APIView):
    """Get recent bookings for admin dashboard"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            limit = int(request.GET.get('limit', 10))
            
            recent_bookings = Booking.objects.filter(
                payment_status='paid'
            ).select_related('user', 'shop').prefetch_related('services').order_by('-created_at')[:limit]
            
            bookings_data = []
            for booking in recent_bookings:
                admin_commission = float(booking.total_amount * Decimal('0.10'))
                
                bookings_data.append({
                    'id': booking.id,
                    'user_name': booking.user.username if booking.user else 'N/A',
                    'user_email': booking.user.email if booking.user else 'N/A',
                    'shop_name': booking.shop.name if booking.shop else 'N/A',
                    'services': [service.name for service in booking.services.all()],
                    'appointment_date': booking.appointment_date,
                    'appointment_time': booking.appointment_time,
                    'total_amount': float(booking.total_amount),
                    'admin_commission': admin_commission,
                    'booking_status': booking.booking_status,
                    'payment_status': booking.payment_status,
                    'created_at': booking.created_at
                })

            return Response({
                'recent_bookings': bookings_data
            })

        except Exception as e:
            logger.error(f"Error in AdminRecentBookingsView: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminCommissionReportView(APIView):
    """Get detailed commission report for admin"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get date range
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=30)
            
            if request.GET.get('start_date'):
                start_date = datetime.strptime(request.GET.get('start_date'), '%Y-%m-%d').date()
            if request.GET.get('end_date'):
                end_date = datetime.strptime(request.GET.get('end_date'), '%Y-%m-%d').date()

            # Get daily commission data for chart
            daily_commission = Booking.objects.filter(
                payment_status='paid',
                created_at__date__range=[start_date, end_date]
            ).values('created_at__date').annotate(
                daily_revenue=Sum('total_amount'),
                daily_bookings=Count('id')
            ).order_by('created_at__date')

            commission_details = []
            total_commission = Decimal('0.00')
            total_bookings = 0

            for day_data in daily_commission:
                commission_amount = day_data['daily_revenue'] * Decimal('0.10')
                total_commission += commission_amount
                total_bookings += day_data['daily_bookings']
                
                commission_details.append({
                    'date': day_data['created_at__date'].strftime('%Y-%m-%d'),
                    'commission_amount': float(commission_amount),
                    'bookings_count': day_data['daily_bookings'],
                    'revenue': float(day_data['daily_revenue'])
                })

            return Response({
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date
                },
                'summary': {
                    'total_commission': float(total_commission),
                    'total_bookings': total_bookings,
                    'commission_rate': 10.0
                },
                'commission_details': commission_details
            })

        except Exception as e:
            logger.error(f"Error in AdminCommissionReportView: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminPayShopCommissionView(APIView):
    """Pay commission to shop (if you want to track payments)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            shop_id = request.data.get('shop_id')
            amount = request.data.get('amount')
            
            # You can add your payment processing logic here
            # For now, just return success
            
            return Response({
                'success': True,
                'message': f'Payment of ₹{amount} processed for shop {shop_id}'
            })
            
        except Exception as e:
            logger.error(f"Error in AdminPayShopCommissionView: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminExportDataView(APIView):
    """Export dashboard data to CSV"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            from django.http import HttpResponse
            import csv
            
            export_type = request.GET.get('type', 'shops')  # shops, bookings, commission
            
            response = HttpResponse(content_type='text/csv')
            
            if export_type == 'shops':
                response['Content-Disposition'] = 'attachment; filename="shops_performance.csv"'
                writer = csv.writer(response)
                writer.writerow(['Shop Name', 'Owner', 'Total Revenue', 'Commission', 'Bookings', 'Rating'])
                
                # Get shops data (you can reuse logic from AdminShopsPerformanceView)
                shops = Shop.objects.filter(
                    booking__payment_status='paid'
                ).distinct()
                
                for shop in shops:
                    shop_bookings = Booking.objects.filter(
                        shop=shop,
                        payment_status='paid'
                    )
                    
                    total_revenue = shop_bookings.aggregate(
                        total=Sum('total_amount')
                    )['total'] or Decimal('0.00')
                    
                    total_bookings = shop_bookings.count()
                    average_rating = shop.get_average_rating() or 0
                    
                    writer.writerow([
                        shop.name,
                        shop.owner_name or shop.user.username,
                        float(total_revenue),
                        float(total_revenue * Decimal('0.10')),
                        total_bookings,
                        round(float(average_rating), 2) if average_rating else 0
                    ])
            
            return response
            
        except Exception as e:
            logger.error(f"Error in AdminExportDataView: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        








# Add this to your existing view or create a new one
class RecordShopPaymentView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List all shop commission payments with optional filtering"""
        try:
            # Get query parameters for filtering
            shop_id = request.query_params.get('shop_id')
            payment_method = request.query_params.get('payment_method')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Start with all payments
            payments = ShopCommissionPayment.objects.all()
            
            # Apply filters
            if shop_id:
                payments = payments.filter(shop_id=shop_id)
            if payment_method:
                payments = payments.filter(payment_method=payment_method)
            if start_date:
                payments = payments.filter(payment_date__gte=start_date)
            if end_date:
                payments = payments.filter(payment_date__lte=end_date)
            
            # Order by most recent first
            payments = payments.order_by('-payment_date')
            
            # Serialize the data
            payment_data = []
            for payment in payments:
                payment_data.append({
                    'id': payment.id,
                    'shop_id': payment.shop.id,
                    'shop_name': payment.shop.name,  # Assuming shop has a name field
                    'amount': float(payment.amount),
                    'payment_method': payment.payment_method,
                    'transaction_reference': payment.transaction_reference,
                    'payment_date': payment.payment_date.strftime('%Y-%m-%d'),
                    'notes': payment.notes,
                    'paid_by': payment.paid_by.username if payment.paid_by else None,
                    'created_at': payment.created_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(payment, 'created_at') else None
                })
            
            return Response({
                'payments': payment_data,
                'total_count': len(payment_data)
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        # Your existing POST method remains the same
        try:
            data = request.data
            shop_id = data.get('shop_id')
            amount = data.get('amount')
            payment_method = data.get('payment_method')
            transaction_reference = data.get('transaction_reference', '')
            payment_date = data.get('payment_date')
            notes = data.get('notes', '')
            
            # Validate required fields
            if not all([shop_id, amount, payment_method, payment_date]):
                return Response(
                    {'error': 'Missing required fields'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get shop
            shop = Shop.objects.get(id=shop_id)
            
            # Create payment record
            payment = ShopCommissionPayment.objects.create(
                shop=shop,
                amount=amount,
                payment_method=payment_method,
                transaction_reference=transaction_reference,
                payment_date=payment_date,
                notes=notes,
                paid_by=request.user
            )
            
            return Response({
                'message': 'Payment recorded successfully',
                'payment_id': payment.id
            })
            
        except Shop.DoesNotExist:
            return Response(
                {'error': 'Shop not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )