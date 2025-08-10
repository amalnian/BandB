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
    RecentAppointmentsView,
    RecordShopPaymentView
)
from admin_panel import views

# Router for ViewSets
router = DefaultRouter()
router.register('users', AdminUserViewSet, basename='admin-users')
router.register('shops', AdminShopViewSet, basename='admin-shops')

urlpatterns = [
    # Include ViewSet routes
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('token/', AdminTokenObtainPairView.as_view(), name='admin-login'),
    path('token/refresh/', AdminTokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', Logout.as_view(), name='logout'),
    path('check/', AdminStatusView.as_view(), name='check-admin'),
    
    # Dashboard endpoints
    path('dashboard/stats/', views.AdminDashboardStatsView.as_view(), name='admin_dashboard_stats'),
    path('dashboard/revenue-chart/', views.AdminRevenueChartView.as_view(), name='admin_revenue_chart'),
    path('dashboard/shops-performance/', views.AdminShopsPerformanceView.as_view(), name='admin_shops_performance'),
    path('dashboard/recent-bookings/', views.AdminRecentBookingsView.as_view(), name='admin_recent_bookings'),
    path('dashboard/appointments/', RecentAppointmentsView.as_view(), name='recent-appointments'),
    path('dashboard/commission-report/', views.AdminCommissionReportView.as_view(), name='admin_commission_report'),
    path('dashboard/export/', views.AdminExportDataView.as_view(), name='admin_export_data'),
    
    # Payment management
    path('dashboard/pay-shop/', views.AdminPayShopCommissionView.as_view(), name='admin_pay_shop'),
    path('record-payment/', RecordShopPaymentView.as_view(), name='record-payment'),
    
    # Settings endpoints
    path('settings/profile/', AdminProfileView.as_view(), name='admin_profile'),
    path('settings/change-password/', AdminChangePasswordView.as_view(), name='admin_change_password'),
]