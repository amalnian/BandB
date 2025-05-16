from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminShopViewSet,
    AdminUserViewSet,
    AdminStatusView,
    DashboardStatsView,
    RecentAppointmentsView
)

# Create a router for ViewSets
router = DefaultRouter()
router.register('users', AdminUserViewSet, basename='admin-users')
router.register(r'shops', AdminShopViewSet)


urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    
    # Admin status verification endpoint
    path('check/', AdminStatusView.as_view(), name='check-admin'),
    
    # Dashboard data endpoints
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/appointments/', RecentAppointmentsView.as_view(), name='recent-appointments'),
    
    # The router will automatically create these URL patterns:
    # users/ - GET (list), POST (create)
    # users/{id}/ - GET (retrieve), PUT (update), PATCH (partial_update), DELETE (destroy)
    # users/{id}/toggle_status/ - PATCH (custom action)
]