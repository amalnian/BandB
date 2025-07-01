from datetime import timezone
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email.split('@')[0])
        extra_fields.setdefault('is_active', False)  # Changed to False for email verification
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)  # Superusers should be active by default
        extra_fields.setdefault('username', email.split('@')[0])

        if extra_fields.get('is_staff') is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get('is_superuser') is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('user', 'User'),
        ('shop', 'Shop Owner'),  # Added shop role
    )
    profile_url = models.URLField(blank=True,null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(null=True, blank=True)
    is_blocked = models.BooleanField(default=False)  # Added is_blocked field
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    current_latitude = models.DecimalField(
        max_digits=10, decimal_places=8, blank=True, null=True,
        help_text="Current latitude of user"
    )
    current_longitude = models.DecimalField(
        max_digits=11, decimal_places=8, blank=True, null=True,
        help_text="Current longitude of user"
    )
    location_enabled = models.BooleanField(default=False, help_text="Whether user has enabled location services")
    date_of_birth = models.DateField(blank=True, null=True)
    phone = models.CharField(
        validators=[phone_regex], 
        max_length=17, 
        blank=True, 
        null=True,
        help_text="Phone number with country code"
    )    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = CustomUserManager()
    
    def is_shop_owner(self):
        """Helper method to check if user is a shop owner"""
        return self.role == 'shop'
    
    def update_location(self, latitude, longitude):
        """Update user's current location"""
        self.current_latitude = latitude
        self.current_longitude = longitude
        self.location_enabled = True
        self.save()

        
class Wallet(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user}'s Wallet"


class WalletTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
    ]

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=6, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.pk: 
            if self.transaction_type == 'credit':
                self.wallet.balance += self.amount
            elif self.transaction_type == 'debit':
                if self.wallet.balance < self.amount:
                    raise ValueError("Insufficient wallet balance.")
                self.wallet.balance -= self.amount
            self.wallet.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_type} ₹{self.amount} on {self.timestamp.strftime('%Y-%m-%d')}"