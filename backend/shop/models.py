from django.db import models
from django.utils import timezone
from users.models import CustomUser
import datetime


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


class OTP(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='otps')
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    def is_valid(self):
        return timezone.now() <= self.expires_at
    
    @classmethod
    def create_for_shop(cls, shop):
        import random
        import string
        
        # Generate OTP
        otp_code = ''.join(random.choices(string.digits, k=6))
        
        # Set expiry time (e.g., 10 minutes from now)
        expires_at = timezone.now() + datetime.timedelta(minutes=10)
        
        # Create and return the OTP object
        return cls.objects.create(
            shop=shop,
            otp_code=otp_code,
            expires_at=expires_at
        )
    


class Service(models.Model):
    """
    Services offered by shops.
    """
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_minutes = models.IntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.shop.name})"


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
    scheduled_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.customer.name} - {self.service.name} - {self.scheduled_time.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        # If price is not specified, use the service price
        if not self.price and self.service:
            self.price = self.service.price
            
        # Calculate end time based on service duration
        if not self.end_time and self.scheduled_time and self.service:
            from datetime import timedelta
            self.end_time = self.scheduled_time + timedelta(minutes=self.service.duration_minutes)
            
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-scheduled_time']


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