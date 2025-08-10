import re

from users.tasks import send_forgot_password_otp_task, send_registration_otp_task
from .models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.utils import timezone
import random
import string
from django.core.mail import send_mail
from django.conf import settings
import logging
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role  
        return token



class CustomUserCreateSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='get_display_name', read_only=True)
    display_image = serializers.CharField(source='get_display_image', read_only=True)

    class Meta:
        model = CustomUser
        fields = ('id','display_name', 'display_image', 'first_name', 'last_name', 'username', 'email', 'password', 'role', 'phone','current_latitude', 'current_longitude', 'location_enabled')
        extra_kwargs = {
            'password': {'write_only': True}  
        }
    
    def validate_current_latitude(self, value): 
        if value is not None and not (-90 <= float(value) <= 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90 degrees.")
        return value
    
    def validate_current_longitude(self, value):  
        if value is not None and not (-180 <= float(value) <= 180):
            raise serializers.ValidationError("Longitude must be between -180 and 180 degrees.")
        return value

    def validate(self, attrs):
        attrs['role'] = 'user'
        return super().validate(attrs)

    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists, it should be unique")
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        return value
        
    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists, it should be unique")
        return value
        
    def validate_phone(self, value): 
        if value and not re.match(r'^\+?1?\d{9,15}$', value): 
            raise serializers.ValidationError("Phone number must be in the format: '+999999999'. Up to 15 digits allowed.")
        if value and CustomUser.objects.filter(phone=value).exists(): 
            raise serializers.ValidationError("Phone number already exists.")
        return value
        
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r'[A-Za-z]', value) or not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one letter and one number.")
        return value

    def create(self, validated_data):
        try:
            password = validated_data.pop('password')
            
            user = CustomUser(**validated_data)
            
            user.set_password(password)
            
            user.is_active = False
            
            otp = ''.join(random.choices(string.digits, k=6))
            user.otp = otp
            user.otp_created_at = timezone.now()
            
            user.save()

            # Send OTP email
            from users.tasks import send_otp_email_task
            try:
                send_otp_email_task.delay(user.email, otp, "Your Registration Verification Code")
                logger.info(f"OTP email sent successfully to {user.email}")
            except Exception as email_error:
                logger.warning(f"Failed to send OTP email to {user.email}: {str(email_error)}")
            
            return user
        except Exception as e:
            logger.error(f"Error in user creation: {str(e)}")
            raise
        
        

class EmailOTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate(self, data):
        try:
            user = CustomUser.objects.get(email=data['email'])
            
            if not user.otp or not user.otp_created_at:
                raise serializers.ValidationError("No OTP found for this account. Please request a new one.")
                
            if timezone.now() > user.otp_created_at + timezone.timedelta(minutes=10):
                raise serializers.ValidationError("OTP has expired. Please request a new one.")
                
            if user.otp != data['otp']:
                raise serializers.ValidationError("Invalid OTP.")
                
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        return data
        
        
class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate(self, data):
        try:
            user = CustomUser.objects.get(email=data['email'])
            
            if user.is_active:
                raise serializers.ValidationError("Account is already verified.")
                
            if user.is_blocked:
                raise serializers.ValidationError("This account has been blocked. Please contact support.")
                
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("User not found.")
            
        return data


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin user management - matches React component fields"""
    class Meta:
        model = CustomUser
        fields = ('id', 'first_name', 'last_name', 'email', 'phone', 'role', 'is_active')
        
    # Your React component uses 'phone' field, but your model has 'phone_number'
    # Let's add a field mapping for this
    phone = serializers.CharField(source='phone_number', required=False, allow_blank=True)

    def to_representation(self, instance):
        """Adjust the representation to match what the React component expects"""
        data = super().to_representation(instance)
        # Ensure null values are represented as empty strings for the frontend
        for field in ['first_name', 'last_name', 'phone']:
            if data.get(field) is None:
                data[field] = ''
        return data
    
    def create(self, validated_data):
        """Custom create to handle phone_number vs phone field"""
        # Extract phone if it comes from the frontend as 'phone'
        if 'phone_number' in validated_data:
            phone = validated_data.pop('phone_number')
            validated_data['phone_number'] = phone
            
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Custom update to handle phone_number vs phone field"""
        # Extract phone if it comes from the frontend as 'phone'
        if 'phone_number' in validated_data:
            phone = validated_data.pop('phone_number')
            validated_data['phone_number'] = phone
            
        return super().update(instance, validated_data)


class UserBlockUnblockSerializer(serializers.Serializer):
    """Serializer for handling block/unblock actions"""
    is_blocked = serializers.BooleanField(required=True)

    def update(self, instance, validated_data):
        # Only regular users (role='user' and is_staff=False) can be blocked
        if instance.is_staff:
            raise serializers.ValidationError(
                "Staff members cannot be blocked."
            )
            
        instance.is_blocked = validated_data.get('is_blocked', instance.is_blocked)
        instance.save()
        return instance


# Update to the UserStatusSerializer in serializers.py

class UserStatusSerializer(serializers.Serializer):
    """Serializer for handling active/inactive status"""
    is_active = serializers.BooleanField(required=True)

    def update(self, instance, validated_data):
        # Check if the user is an admin before allowing status change
        if instance.is_staff and not validated_data.get('is_active', True):
            raise serializers.ValidationError(
                "Staff accounts cannot be deactivated through this interface."
            )
            
        # Update the user's active status
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.save()
        return instance
    

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
        return value

    def create(self, validated_data):
        email = validated_data['email']
        try:
            user = CustomUser.objects.get(email=email)
        except ObjectDoesNotExist:
            raise serializers.ValidationError("No user found with this email address.")

        otp = ''.join(random.choices(string.digits, k=6))

        user.otp = otp
        user.otp_created_at = timezone.now()
        user.save()

        # Use Celery to send the email in the background
        send_forgot_password_otp_task(email, otp)

        return user

class VerifyForgotPasswordOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate(self, data):
        email = data.get('email')
        otp = data.get('otp')
        User = CustomUser
        
        try:
            user = User.objects.get(email=email)
            if user.otp != otp:
                raise serializers.ValidationError("Invalid OTP")
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")
        
        return data

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        otp = data.get('otp')
        new_password = data.get('new_password')
        User = CustomUser

        try:
            user = User.objects.get(email=email)
            if user.otp != otp:
                raise serializers.ValidationError("Invalid OTP")
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")
        
        return data

    def update(self, instance, validated_data):
        User = CustomUser
        user = User.objects.get(email=validated_data['email'])
        user.set_password(validated_data['new_password'])
        user.otp = None 
        user.save()
        return user
    

class UserProfileSerializer(serializers.ModelSerializer):    
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'date_of_birth',
            'profile_url',
            'role',
            'is_active',
            'date_joined',
            'last_login',
            'location_enabled',
            'current_latitude',
            'current_longitude'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'role', 'is_active']
    
    def validate_email(self, value):
        user = self.instance
        if user and CustomUser.objects.filter(email=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value
    
    def validate_phone(self, value):
        if value:
            import re
            phone_pattern = re.compile(r'^\+?1?\d{9,15}$')
            cleaned_phone = value.replace(' ', '').replace('-', '')
            if not phone_pattern.match(cleaned_phone):
                raise serializers.ValidationError("Invalid phone number format.")
        return value
    
    def validate_date_of_birth(self, value):
        if value:
            from django.utils import timezone
            if value > timezone.now().date():
                raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New passwords don't match.")
        return attrs
    
    def validate_new_password(self, value):
        """Validate new password using Django's password validators"""
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


class ProfilePictureSerializer(serializers.Serializer):
    profile_picture = serializers.ImageField(required=True)
    
    def validate_profile_picture(self, value):
        # Check file size (5MB max)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("File size too large. Maximum 5MB allowed.")
        
        # Check file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Invalid file type. Only JPEG, PNG, and GIF are allowed.")
        
        return value