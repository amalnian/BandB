from django.db import models
from django.utils import timezone
from users.models import CustomUser
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


class Appointment(models.Model):
    """
    Appointments made with shops.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    )
    
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='appointments')
    customer = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='appointments')
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='appointments')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.customer.name} - {self.service.name} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        # If price is not specified, use the service price
        if not self.price and self.service:
            self.price = self.service.price
            
        # Calculate end time based on service duration
        if not self.end_time and self.start_time and self.service:
            from datetime import timedelta
            self.end_time = self.start_time + timedelta(minutes=self.service.duration_minutes)
            
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-start_time']


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
    
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    is_closed = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('day_of_week',)
        ordering = ['day_of_week']
    
    def __str__(self):
        if self.is_closed:
            return f"{self.get_day_of_week_display()}: Closed"
        return f"{self.get_day_of_week_display()}: {self.opening_time.strftime('%H:%M')} - {self.closing_time.strftime('%H:%M')}"





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


def get_available_slots(date, barber=None, slot_duration=30):
    """
    Generate available 30-minute time slots for a specific date based on business hours
    and existing appointments.
    
    Args:
        date: The date to check for available slots
        barber: Optional barber to filter slots by
        slot_duration: Duration of each slot in minutes (default: 30)
        
    Returns:
        List of available time slot tuples (start_time, end_time)
    """
    # Check if it's a special closing day
    if SpecialClosingDay.objects.filter(date=date).exists():
        return []
    
    # Get business hours for the day
    weekday = date.weekday()  # 0 is Monday, 6 is Sunday
    try:
        hours = BusinessHours.objects.get(day_of_week=weekday)
        if hours.is_closed:
            return []
    except BusinessHours.DoesNotExist:
        # No hours defined for this day
        return []
    
    # Create datetime objects for opening and closing times
    opening_datetime = datetime.combine(date, hours.opening_time)
    closing_datetime = datetime.combine(date, hours.closing_time)
    
    # Generate all possible 30-minute slots
    all_slots = []
    slot_delta = timedelta(minutes=slot_duration)
    
    # Use rrule to generate time slots
    slots = rrule(
        DAILY,
        dtstart=opening_datetime,
        until=closing_datetime - slot_delta,  # Ensure the last slot ends before closing
        interval=slot_duration // 30  # Convert slot_duration to number of 30-min intervals
    )
    
    for slot_start in slots:
        slot_end = slot_start + slot_delta
        all_slots.append((slot_start, slot_end))
    
    # Filter out slots that already have appointments
    available_slots = []
    appointments_query = Appointment.objects.filter(
        start_time__date=date,
        status__in=['scheduled']  # Only consider active appointments
    )
    
    if barber:
        appointments_query = appointments_query.filter(barber=barber)
    
    booked_appointments = list(appointments_query.values_list('start_time', 'end_time'))
    
    for slot_start, slot_end in all_slots:
        is_available = True
        for appt_start, appt_end in booked_appointments:
            # Check if slot overlaps with any appointment
            if (slot_start < appt_end and slot_end > appt_start):
                is_available = False
                break
        
        if is_available:
            available_slots.append((slot_start, slot_end))
    
    return available_slots


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