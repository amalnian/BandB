# Add this to your views.py file
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from users.models import CustomUser
from users.serializers import AdminUserSerializer, UserStatusSerializer
from rest_framework.views import APIView


from rest_framework import viewsets, permissions, filters
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from shop.models import Shop
from shop.serializers import ShopSerializer, AdminShopSerializer


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
        
        # You can add more stats as needed
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'new_this_month': CustomUser.objects.filter(
                date_joined__month=timezone.now().month,
                date_joined__year=timezone.now().year
            ).count()
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