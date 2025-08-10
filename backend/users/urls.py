from django.urls import path
from . import views
from users.views import (
    # Authentication
    CoustomTokenObtainPairView, CustomTokenRefreshView, Logout, GoogleAuthView,
    EmailOTPVerifyView, ResendOTPView, ForgotPasswordView, VerifyForgotPasswordOTPView,
    ResetPasswordView, RegisterUserView,

    # User
    UserProfileView, UpdateUserProfileView, ChangePasswordView, UpdateUserLocationView,
    ProfilePictureView, UserStatsView,

    # Shops
    NearbyShopsView, SearchNearbyShopsView, AllShopsView, ShopDetailView,
    ShopServicesView, ShopBusinessHoursView, AvailableTimeSlotsView, ServiceDurationView,

    # Bookings
    CreateBookingView, ShopBookingsAPIView, BookingStatusUpdateAPIView, BookingStatsAPIView,
    UserBookingListView,

    # Payments
    CreateRazorpayOrderView, VerifyRazorpayPaymentView, HandlePaymentFailureView,

    # Feedback
    BookingFeedbackView, UserBookingFeedbackListView,

    # Slots
    SlotReservationView
)

urlpatterns = [
    # ----------------- Authentication -----------------
    path('token/', CoustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', Logout.as_view(), name='logout'),
    path('users/', RegisterUserView.as_view(), name='register_user'),
    path('verify-otp/', EmailOTPVerifyView.as_view(), name='verify-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-forgot-password-otp/', VerifyForgotPasswordOTPView.as_view(), name='verify-forgot-password-otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('google/', GoogleAuthView.as_view(), name='google-signin'),

    # ----------------- User -----------------
    path('user/profile/', UserProfileView.as_view(), name='get_user_profile'),
    path('user/profile/update/', UpdateUserProfileView.as_view(), name='update_user_profile'),
    path('user/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('user/profile-picture/', ProfilePictureView.as_view(), name='profile_picture'),
    path('user/update-location/', UpdateUserLocationView.as_view(), name='update-user-location'),
    path('user/stats/', UserStatsView.as_view(), name='user_stats'),

    # ----------------- Shops -----------------
    path('shops/', AllShopsView.as_view(), name='all-shops'),
    path('shops/nearby/', NearbyShopsView.as_view(), name='nearby-shops'),
    path('shops/search-nearby/', SearchNearbyShopsView.as_view(), name='search-nearby-shops'),
    path('shopdetail/<int:id>/', ShopDetailView.as_view(), name='shop-detail'),
    path('shops/<int:shop_id>/services/', ShopServicesView.as_view(), name='shop-services'),
    path('shops/<int:shop_id>/business-hours/', ShopBusinessHoursView.as_view(), name='shop-business-hours'),
    path('shops/<int:shop_id>/available-slots/', AvailableTimeSlotsView.as_view(), name='available-slots'),
    path('shops/<int:shop_id>/service-duration/', ServiceDurationView.as_view(), name='service-duration'),

    # ----------------- Bookings -----------------
    path('bookings/create/', CreateBookingView.as_view(), name='create-booking'),
    path('bookings/', UserBookingListView.as_view(), name='user-bookings'),
    path('bookings/<int:booking_id>/cancel/', views.cancel_booking, name='cancel-booking'),
    path('shop/bookings/', ShopBookingsAPIView.as_view(), name='shop_bookings'),
    path('shop/bookings/<int:booking_id>/status/', BookingStatusUpdateAPIView.as_view(), name='update_booking_status'),
    path('shop/bookings/stats/', BookingStatsAPIView.as_view(), name='booking_stats'),

    # ----------------- Payments -----------------
    path('payment/razorpay/create-order/', CreateRazorpayOrderView.as_view(), name='create-razorpay-order'),
    path('payment/razorpay/verify/', VerifyRazorpayPaymentView.as_view(), name='verify-razorpay-payment'),
    path('payment/razorpay/failure/', HandlePaymentFailureView.as_view(), name='handle-payment-failure'),

    # ----------------- Wallet -----------------
    path('wallet/balance/', views.WalletBalanceView.as_view(), name='wallet_balance'),
    path('wallet/transactions/', views.WalletTransactionsView.as_view(), name='wallet_transactions'),
    path('wallet/add-money/', views.AddMoneyToWalletView.as_view(), name='add_money_to_wallet'),

    # ----------------- Feedback -----------------
    path('shop/bookings/<int:booking_id>/feedback/', BookingFeedbackView.as_view(), name='booking_feedback'),
    path('shop/user/feedbacks/', UserBookingFeedbackListView.as_view(), name='user_feedbacks'),

    # ----------------- Notifications -----------------
    path('notifications/', views.NotificationListView.as_view(), name='notification-list'),
    path('notifications/mark-read/', views.NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/mark-all-read/', views.NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
    path('notifications/delete/<int:notification_id>/', views.NotificationDeleteView.as_view(), name='notification-delete'),

    # ----------------- Slots -----------------
    path('slots/reserve/', SlotReservationView.as_view(), name='reserve-slot'),
    path('slots/release/', SlotReservationView.as_view(), name='release-slot'),
]
