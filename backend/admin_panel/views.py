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
from shop.models import Shop
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

            res.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=True,
                samesite="None",
                path='/',
                max_age=3600
            )

            res.set_cookie(
                key="refresh_token",
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
            
            # Use the serializer directly instead of modifying request
            serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
            
            if serializer.is_valid():
                access_token = serializer.validated_data["access"]
                
                res = Response(
                    {"success": True, "message": "Access token refreshed"},
                    status=status.HTTP_200_OK
                )

                res.set_cookie(
                    key="access_token",
                    value=access_token,
                    httponly=True,
                    secure=True,
                    samesite="None",
                    path='/',
                    max_age=3600
                )

                return res
            else:
                return Response(
                    {"success": False, "message": "Refresh token expired or invalid"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
        except Exception as e:
            return Response(
                {"success": False, "message": f"An error occurred: {str(e)}"},
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
    authentication_classes = [JWTAuthentication]
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
    authentication_classes = [JWTAuthentication]
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