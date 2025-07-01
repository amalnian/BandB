# urls.py file
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminChangePasswordView,
    AdminProfileView,
    AdminShopViewSet,
    AdminTokenObtainPairView,
    AdminTokenRefreshView,
    AdminUserViewSet,
    AdminStatusView,
    DashboardStatsView,
    Logout,
    RecentAppointmentsView
)

# Create a router for ViewSets
router = DefaultRouter()
router.register('users', AdminUserViewSet, basename='admin-users')
router.register('shops', AdminShopViewSet, basename='admin-shops')

urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    path('token/', AdminTokenObtainPairView.as_view(), name='admin-login'),
    path('token/refresh/', AdminTokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', Logout.as_view(), name='logout'),
    # Admin status verification endpoint
    path('check/', AdminStatusView.as_view(), name='check-admin'),
    
    # Dashboard data endpoints
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/appointments/', RecentAppointmentsView.as_view(), name='recent-appointments'),
    path('profile/',AdminProfileView.as_view(), name='admin_profile'),
    path('change-password/',AdminChangePasswordView.as_view(), name='admin_change_password'),

]