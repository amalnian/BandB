# views.py file
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from users.models import CustomUser
from users.serializers import AdminUserSerializer, UserStatusSerializer
from shop.models import Shop
from admin_panel.serializers import AdminShopSerializer


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
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Allow filtering by is_active (which is actually on the User model)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(user__is_active=is_active)
            
        return queryset
    
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
        return CustomUser.objects.all().filter(role = 'user').order_by('-date_joined')
    
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