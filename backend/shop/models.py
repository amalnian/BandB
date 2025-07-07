from django.db import models
from django.utils import timezone
from users.models import CustomUser, Wallet, WalletTransaction
import datetime
from datetime import datetime, timedelta
from dateutil.rrule import rrule, DAILY, MO, TU, WE, TH, FR, SA, SU

class Shop(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='shop')
    name = models.CharField(max_length=100)
    email = models.EmailField(editable=False)  # Will be automatically set from user's email
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    description = models.TextField(blank=True)
    owner_name = models.CharField(max_length=100, blank=True)
    opening_hours = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=15, decimal_places=12, blank=True, null=True)
    longitude = models.DecimalField(max_digits=15, decimal_places=12, blank=True, null=True)
    # Fields for verification and approval
    is_email_verified = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    approval_request_date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    @property
    def is_active(self):
        return self.user.is_active
    
    def get_average_rating(self):
        """
        Calculate the average rating from shop reviews
        """
        reviews = self.reviews.all()
        if not reviews:
            return None
        total = sum(review.rating for review in reviews)
        return round(total / reviews.count(), 1)
    
    def save(self, *args, **kwargs):
        # Always set email to user's email
        if self.user:
            self.email = self.user.email
            
            # Set user role to 'shop' if not already set
            if self.user.role != 'shop':
                self.user.role = 'shop'
                self.user.save(update_fields=['role'])
                
        super().save(*args, **kwargs)
        

class ShopImage(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField(max_length=500)  # Cloudinary URL
    public_id = models.CharField(max_length=255)  # Cloudinary public_id
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
        
        current_time = timezone.now()  # This gets current UTC time
        
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
        
        # Generate 6-digit OTP
        otp_code = ''.join(random.choices(string.digits, k=6))
        
        # Set expiration to 10 minutes from now (in UTC)
        expires_at = timezone.now() + timezone.timedelta(minutes=10)
        
        # Create OTP
        otp = cls.objects.create(
            shop=shop,
            otp_code=otp_code,
            expires_at=expires_at
        )
        
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Created OTP - Code: {otp_code}")
        logger.info(f"Created OTP - Current time: {timezone.now()}")
        logger.info(f"Created OTP - Expires at: {expires_at}")
        logger.info(f"Created OTP - Valid for: {(expires_at - timezone.now()).total_seconds()} seconds")
        
        return otp

    


class Service(models.Model):
    """
    Services offered by shops.
    """
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_minutes = models.IntegerField(default=30)
    # Number of continuous slots this service requires
    # Will be calculated automatically based on duration_minutes and slot_size
    slots_required = models.PositiveIntegerField(default=1)
    # Default slot size in minutes (for calculating slots_required)
    default_slot_size = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.shop.name})"
    
    def save(self, *args, **kwargs):
        # Calculate slots_required based on duration_minutes and default_slot_size
        if self.duration_minutes and self.default_slot_size:
            # Calculate how many slots this service requires
            # Use ceiling division to round up (e.g., 45 minutes with 30-minute slots = 2 slots)
            import math
            self.slots_required = math.ceil(self.duration_minutes / self.default_slot_size)
        super().save(*args, **kwargs)


class BusinessHours(models.Model):
    """Model to store the barbershop's opening and closing hours for each day of the week."""
    DAYS_OF_WEEK = (
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    )

    shop = models.ForeignKey('Shop', on_delete=models.CASCADE, related_name='business_hours')  # Added missing shop relationship
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    opening_time = models.TimeField(null=True, blank=True)  # Allow null for closed days
    closing_time = models.TimeField(null=True, blank=True)  # Allow null for closed days
    is_closed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('shop', 'day_of_week')  # Updated to include shop
        ordering = ['day_of_week']

    def __str__(self):
        if self.is_closed:
            return f"{self.shop.name} - {self.get_day_of_week_display()}: Closed"
        return f"{self.shop.name} - {self.get_day_of_week_display()}: {self.opening_time.strftime('%H:%M') if self.opening_time else 'N/A'} - {self.closing_time.strftime('%H:%M') if self.closing_time else 'N/A'}"

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

    # Basic booking info
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE)
    services = models.ManyToManyField('Service')
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Status tracking
    booking_status = models.CharField(max_length=20, choices=BOOKING_STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='razorpay')

    # Payment details
    razorpay_order_id = models.CharField(max_length=100, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True)

    # Additional info
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Booking {self.id} - {self.shop.name} - {self.appointment_date}"

    def mark_confirmed(self):
        self.booking_status = 'confirmed'
        self.save()

    def mark_completed(self):
        self.booking_status = 'completed'
        self.save()

    def cancel_booking(self):
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
                # Update booking status
                self.booking_status = 'cancelled'
                self.save()
                
                # Process refund only if payment was successful
                if self.payment_status == 'paid':
                    # Get or create user's wallet
                    wallet, created = Wallet.objects.get_or_create(
                        user=self.user,
                        defaults={'balance': 0.00}
                    )
                    
                    # Create credit transaction
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        transaction_type='credit',
                        amount=self.total_amount,
                        description=f"Refund for cancelled booking #{self.id} - {reason}"
                    )
                    
                    # Update payment status
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
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE)
    
    # Rating and feedback
    rating = models.IntegerField(choices=RATING_CHOICES)
    feedback_text = models.TextField(blank=True, help_text="Optional feedback comment")
    
    # Service-specific ratings (optional)
    service_quality = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    staff_behavior = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    cleanliness = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    value_for_money = models.IntegerField(choices=RATING_CHOICES, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['booking', 'user']  # Ensure one feedback per booking
    
    def __str__(self):
        return f"Feedback for Booking {self.booking.id} - {self.rating} stars"

    



class Notification(models.Model):
    """
    Notifications for shops.
    """
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def time_ago(self):
        """Returns a human-readable time difference (e.g., '3 hours ago')"""
        now = timezone.now()
        diff = now - self.created_at
        
        seconds = diff.total_seconds()
        if seconds < 60:
            return f"{int(seconds)} seconds ago"
        minutes = seconds // 60
        if minutes < 60:
            return f"{int(minutes)} minute{'s' if minutes != 1 else ''} ago"
        hours = minutes // 60
        if hours < 24:
            return f"{int(hours)} hour{'s' if hours != 1 else ''} ago"
        days = hours // 24
        return f"{int(days)} day{'s' if days != 1 else ''} ago"
    
    def __str__(self):
        return f"{self.message[:50]}... ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
    
    class Meta:
        ordering = ['-created_at']


class SpecialClosingDay(models.Model):
    """Model for holidays or special days when the shop is closed."""
    date = models.DateField(unique=True)
    reason = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"{self.date.strftime('%Y-%m-%d')}: {self.reason}"


# Utility functions for time slot generation

def get_weekday_mapping():
    """Map Django weekday integers to dateutil weekday constants."""
    return {
        0: MO,  # Monday
        1: TU,  # Tuesday
        2: WE,  # Wednesday
        3: TH,  # Thursday
        4: FR,  # Friday
        5: SA,  # Saturday
        6: SU,  # Sunday
    }



class Barber(models.Model):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=15, blank=True)
    is_active = models.BooleanField(default=True)
    years_experience = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    

class ShopReview(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(
        choices=[(1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5')]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('shop', 'user')
        
    def __str__(self):
        return f"{self.user.email}'s review for {self.shop.name}"