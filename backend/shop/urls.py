from django.urls import path
from . import views
from .views import (
    # Auth
    CustomShopTokenObtainPairView,
    CustomShopTokenRefreshView,
    ShopRegisterView,
    ShopVerifyOTPView,
    ShopResendOTPView,
    ShopLogoutView,
    ShopForgotPasswordView,
    ShopVerifyForgotPasswordOTPView,
    ShopResetPasswordView,

    # Profile
    ShopProfileView,
    ShopUpdateView,

    # Images
    ShopImageAddView,
    ShopImageRemoveView,
    ShopImageSetPrimaryView,

    # Public shop endpoints
    PublicShopDetailView,
    PublicShopListView,

    # Business hours
    BusinessHoursView,
    BusinessHoursUpdateView,

    # Special closing days
    SpecialClosingDayView,
    SpecialClosingDayDetailView,

    # Services
    ServiceListView,
    ServiceCreateView,
    ServiceUpdateView,
    ServiceDeleteView,

    # Feedback
    ShopFeedbackListView,
    ShopSpecificPaymentView
)

urlpatterns = [
    # ---------------- AUTH ----------------
    path('register/', ShopRegisterView.as_view(), name='shop-register'),
    path('verify-otp/', ShopVerifyOTPView.as_view(), name='shop-verify-otp'),
    path('resend-otp/', ShopResendOTPView.as_view(), name='shop-resend-otp'),
    path('shop/token/', CustomShopTokenObtainPairView.as_view(), name='shop-login'),
    path('shop/token/refresh/', CustomShopTokenRefreshView.as_view(), name='token-refresh'),
    path('shop/logout/', ShopLogoutView.as_view(), name='shop-logout'),

    # Forgot/reset password
    path('forgot-password/', ShopForgotPasswordView.as_view(), name='shop-forgot-password'),
    path('verify-forgot-password-otp/', ShopVerifyForgotPasswordOTPView.as_view(), name='shop-verify-forgot-password-otp'),
    path('reset-password/', ShopResetPasswordView.as_view(), name='shop-reset-password'),

    # ---------------- PROFILE ----------------
    path('shop/profile/', ShopProfileView.as_view(), name='shop-profile'),
    path('shop/update/', ShopUpdateView.as_view(), name='shop-update'),

    # ---------------- IMAGES ----------------
    path('shop/images/add/', ShopImageAddView.as_view(), name='shop_image_add'),
    path('shop/images/<int:image_id>/remove/', ShopImageRemoveView.as_view(), name='shop_image_remove'),
    path('shop/images/<int:image_id>/set-primary/', ShopImageSetPrimaryView.as_view(), name='shop_image_set_primary'),

    # ---------------- PUBLIC SHOP ----------------
    path('public/shop/<int:shop_id>/', PublicShopDetailView.as_view(), name='public_shop_detail'),
    path('public/shops/', PublicShopListView.as_view(), name='public_shop_list'),

    # ---------------- BUSINESS HOURS ----------------
    path('shop/business-hours/', BusinessHoursView.as_view(), name='business_hours'),
    path('shop/business-hours/update/', BusinessHoursUpdateView.as_view(), name='business_hours_update'),

    # ---------------- SPECIAL CLOSING DAYS ----------------
    path('shop/special-closing-days/', SpecialClosingDayView.as_view(), name='special_closing_days'),
    path('shop/special-closing-days/add/', SpecialClosingDayView.as_view(), name='add_special_closing_day'),
    path('shop/special-closing-days/remove/<int:id>/', SpecialClosingDayDetailView.as_view(), name='remove_special_closing_day'),

    # ---------------- SERVICES ----------------
    path('shop/services/', ServiceListView.as_view(), name='service-list'),
    path('shop/services/create/', ServiceCreateView.as_view(), name='service-create'),
    path('shop/services/<int:id>/update/', ServiceUpdateView.as_view(), name='service-update'),
    path('shop/services/<int:id>/delete/', ServiceDeleteView.as_view(), name='service-delete'),

    # ---------------- FEEDBACK ----------------
    path('shops/<int:shop_id>/feedbacks/', ShopFeedbackListView.as_view(), name='shop_feedbacks'),
    path('shops/<int:shop_id>/rating-summary/', views.get_shop_rating_summary, name='shop_rating_summary'),

    # ---------------- PAYMENTS ----------------
    path('shop/<int:shop_id>/payments/', ShopSpecificPaymentView.as_view(), name='shop-payments'),

    # ---------------- ANALYTICS ----------------
    path('shop/sales-chart/', views.SalesChartView.as_view(), name='sales_chart'),
    path('shop/most-booked-services/', views.MostBookedServicesView.as_view(), name='most_booked_services'),
    path('shop/revenue-stats/', views.RevenueStatsView.as_view(), name='revenue_stats'),
    path('shop/service-performance/', views.ServicePerformanceView.as_view(), name='service_performance'),
    path('shop/payment-method-stats/', views.PaymentMethodStatsView.as_view(), name='payment_method_stats'),
    path('shop/booking-stats/', views.BookingStatsView.as_view(), name='booking_stats'),
    path('shop/customer-analytics/', views.CustomerAnalyticsView.as_view(), name='customer_analytics'),
    path('shop/hourly-booking-stats/', views.HourlyBookingStatsView.as_view(), name='hourly_booking_stats'),
    path('shop/export-sales-report/', views.ExportSalesReportView.as_view(), name='export_sales_report'),

    # ---------------- NOTIFICATIONS ----------------
    path('notifications/', views.ShopNotificationsView.as_view(), name='shop-notifications'),
]
