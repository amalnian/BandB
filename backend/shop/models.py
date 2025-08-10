from django.db import models
from django.utils import timezone
from users.models import CustomUser, Wallet, WalletTransaction
import datetime
from datetime import datetime, timedelta
from dateutil.rrule import rrule, DAILY, MO, TU, WE, TH, FR, SA, SU

class Shop(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='shop')
    name = models.CharField(max_length=100)
    email = models.EmailField(editable=False)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    description = models.TextField(blank=True)
    owner_name = models.CharField(max_length=100, blank=True)
    opening_hours = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=15, decimal_places=12, blank=True, null=True)
    longitude = models.DecimalField(max_digits=15, decimal_places=12, blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    approval_request_date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    @property
    def is_active(self):
        return self.user.is_active
    
    def get_average_rating(self):
        """Calculate the average rating from shop reviews (BookingFeedback)"""
        reviews = self.reviews.all()
        if not reviews.exists():
            return None
        total = sum(review.rating for review in reviews)
        return round(total / reviews.count(), 1)
    
    def save(self, *args, **kwargs):
        if self.user:
            self.email = self.user.email
            
            if self.user.role != 'shop':
                self.user.role = 'shop'
                self.user.save(update_fields=['role'])
                
        super().save(*args, **kwargs)
        

class ShopImage(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField(max_length=500)
    public_id = models.CharField(max_length=255)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.shop.name} - Image {self.id}"

    def save(self, *args, **kwargs):
        # If this is set as primary, make all other images non-primary
        if self.is_primary:
            ShopImage.objects.filter(shop=self.shop, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)


class OTP(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='otps')
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    def is_valid(self):
        """Check if OTP is still valid (not expired)"""
        from django.utils import timezone
        
        current_time = timezone.now()
        
        # Debug logging to see what's happening
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"OTP Validation - Current time: {current_time}")
        logger.info(f"OTP Validation - Expires at: {self.expires_at}")
        logger.info(f"OTP Validation - Time difference: {(self.expires_at - current_time).total_seconds()} seconds")
        logger.info(f"OTP Validation - Is valid: {current_time <= self.expires_at}")
        
        return current_time <= self.expires_at
    
    @classmethod
    def create_for_shop(cls, shop):
        """Create OTP for shop with proper timezone handling"""
        from django.utils import timezone
        import random
        import string
        
        otp_code = ''.join(random.choices(string.digits, k=6))
        
        # Set expiration to 10 minutes from now (in UTC)
        expires_at = timezone.now() + timezone.timedelta(minutes=10)
        
        otp = cls.objects.create(
            shop=shop,
            otp_code=otp_code,
            expires_at=expires_at
        )
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Created OTP - Code: {otp_code}")
        logger.info(f"Created OTP - Current time: {timezone.now()}")
        logger.info(f"Created OTP - Expires at: {expires_at}")
        logger.info(f"Created OTP - Valid for: {(expires_at - timezone.now()).total_seconds()} seconds")
        
        return otp


class Service(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_minutes = models.IntegerField(default=30)
    slots_required = models.PositiveIntegerField(default=1)
    default_slot_size = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.shop.name})"
    
    def save(self, *args, **kwargs):
        # Calculate slots_required based on duration_minutes and default_slot_size
        if self.duration_minutes and self.default_slot_size:
            # Use ceiling division to round up (e.g., 45 minutes with 30-minute slots = 2 slots)
            import math
            self.slots_required = math.ceil(self.duration_minutes / self.default_slot_size)
        super().save(*args, **kwargs)


class BusinessHours(models.Model):
    DAYS_OF_WEEK = (
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    )

    shop = models.ForeignKey('Shop', on_delete=models.CASCADE, related_name='business_hours')
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('shop', 'day_of_week')
        ordering = ['day_of_week']

    def __str__(self):
        if self.is_closed:
            return f"{self.shop.name} - {self.get_day_of_week_display()}: Closed"
        return f"{self.shop.name} - {self.get_day_of_week_display()}: {self.opening_time.strftime('%H:%M') if self.opening_time else 'N/A'} - {self.closing_time.strftime('%H:%M') if self.closing_time else 'N/A'}"

from django.core.exceptions import ValidationError


class Booking(models.Model):
    BOOKING_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('razorpay', 'Razorpay'),
        ('wallet', 'Wallet'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE)
    services = models.ManyToManyField('Service')
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    booking_status = models.CharField(max_length=20, choices=BOOKING_STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='razorpay')

    razorpay_order_id = models.CharField(max_length=100, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Booking {self.id} - {self.shop.name} - {self.appointment_date}"

    def is_appointment_time_passed(self):
        """Check if the appointment date and time have passed"""
        now = timezone.now()
        appointment_datetime = timezone.make_aware(
            datetime.combine(self.appointment_date, self.appointment_time)
        )
        return now > appointment_datetime

    def can_be_completed(self):
        """Check if booking can be marked as completed"""
        return (
            self.booking_status == 'confirmed' and 
            self.is_appointment_time_passed()
        )

    def mark_confirmed(self):
        self.booking_status = 'confirmed'
        self.save()

    def mark_completed(self):
        """Mark booking as completed - only if appointment time has passed"""
        if not self.is_appointment_time_passed():
            raise ValidationError("Booking cannot be completed before the appointment time")
        
        if self.booking_status != 'confirmed':
            raise ValidationError("Only confirmed bookings can be marked as completed")
        
        self.booking_status = 'completed'
        self.save()

    def cancel_booking(self):
        if self.booking_status == 'completed':
            raise ValidationError("Completed bookings cannot be cancelled")
        
        self.booking_status = 'cancelled'
        self.save()

    def mark_payment_successful(self, payment_id, order_id):
        self.payment_status = 'paid'
        self.razorpay_payment_id = payment_id
        self.razorpay_order_id = order_id
        self.save()

    def has_feedback(self):
        """Check if this booking has feedback"""
        try:
            return hasattr(self, 'feedback') and self.feedback is not None
        except BookingFeedback.DoesNotExist:
            return False

    def can_give_feedback(self):
        """Check if feedback can be given for this booking"""
        return (
            self.booking_status == 'completed' and 
            not self.has_feedback()
        )
    
    def cancel_with_refund(self, reason="Shop closed on selected date"):
        """Cancel booking and process refund to wallet"""
        from django.db import transaction
        
        with transaction.atomic():
            self.booking_status = 'cancelled'
            self.save()
            
            # Process refund only if payment was successful
            if self.payment_status == 'paid':
                wallet, created = Wallet.objects.get_or_create(
                    user=self.user,
                    defaults={'balance': 0.00}
                )
                
                WalletTransaction.objects.create(
                    wallet=wallet,
                    transaction_type='credit',
                    amount=self.total_amount,
                    description=f"Refund for cancelled booking #{self.id} - {reason}"
                )
                
                self.payment_status = 'refunded'
                self.save()
                
                return True
        return False


class BookingFeedback(models.Model):
    RATING_CHOICES = [
        (1, '1 Star'),
        (2, '2 Stars'),
        (3, '3 Stars'),
        (4, '4 Stars'),
        (5, '5 Stars'),
    ]
    
    booking = models.OneToOneField('Booking', on_delete=models.CASCADE, related_name='feedback')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='reviews')
    
    rating = models.IntegerField(choices=RATING_CHOICES)
    feedback_text = models.TextField(blank=True, help_text="Optional feedback comment")
    
    service_quality = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    staff_behavior = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    cleanliness = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    value_for_money = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['booking', 'user']
    
    def __str__(self):
        return f"Feedback for Booking {self.booking.id} - {self.rating} stars"


class SpecialClosingDay(models.Model):
    shop = models.ForeignKey('Shop', on_delete=models.CASCADE, related_name='special_closing_days', null=True, blank=True)
    date = models.DateField()
    reason = models.CharField(max_length=100, blank=True)
    
    class Meta:
        unique_together = ('shop', 'date')
    
    def __str__(self):
        return f"{self.shop.name} - {self.date.strftime('%Y-%m-%d')}: {self.reason}"


def get_weekday_mapping():
    """Map Django weekday integers to dateutil weekday constants"""
    return {
        0: MO,  # Monday
        1: TU,  # Tuesday
        2: WE,  # Wednesday
        3: TH,  # Thursday
        4: FR,  # Friday
        5: SA,  # Saturday
        6: SU,  # Sunday
    }


class ShopCommissionPayment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('upi', 'UPI'),
        ('cash', 'Cash'),
        ('cheque', 'Cheque'),
    ]

    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='commission_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    transaction_reference = models.CharField(max_length=100, blank=True)
    payment_date = models.DateTimeField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='paid')
    
    paid_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment to {self.shop.name} - ₹{self.amount}"


class TemporarySlotReservation(models.Model):
    """
    Temporary reservation of time slots to prevent double booking
    during the booking process - updated to handle service-based timing
    """
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    shop = models.ForeignKey('Shop', on_delete=models.CASCADE)
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    slots_needed = models.IntegerField(default=1)
    total_service_duration = models.IntegerField(default=30)
    service_end_time = models.TimeField(null=True, blank=True)
    service_ids = models.JSONField(default=list, blank=True)
    reserved_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    session_id = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['expires_at']),
            models.Index(fields=['shop', 'appointment_date']),
            models.Index(fields=['user', 'shop', 'appointment_date']),
        ]
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Default reservation time is 10 minutes
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Reservation: {self.user.username} - {self.shop.name} - {self.appointment_date} {self.appointment_time}"
    
    @property
    def is_primary_reservation(self):
        """Check if this is the primary reservation (first slot)"""
        return not TemporarySlotReservation.objects.filter(
            user=self.user,
            shop=self.shop,
            appointment_date=self.appointment_date,
            appointment_time__lt=self.appointment_time,
            expires_at__gt=timezone.now()
        ).exists()
    
    def get_all_related_reservations(self):
        """Get all reservations for the same booking"""
        return TemporarySlotReservation.objects.filter(
            user=self.user,
            shop=self.shop,
            appointment_date=self.appointment_date,
            expires_at__gt=timezone.now()
        ).order_by('appointment_time')