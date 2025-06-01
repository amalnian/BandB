# serializers.py
import re
from .models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.utils import timezone
import random
import string
from django.core.mail import send_mail
from django.conf import settings
import logging

# Set up logger
logger = logging.getLogger(__name__)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role  
        return token



class CustomUserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'first_name', 'last_name', 'username', 'email', 'password', 'role', 'phone_number')
        extra_kwargs = {
            'password': {'write_only': True}  # Make password write-only
        }

    def validate(self, attrs):
        # Always set default role to 'user' even if provided in the request
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
        
    def validate_phone_number(self, value):  # Fixed method name
        if value and not re.match(r'^\d{10}$', value):
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        if value and CustomUser.objects.filter(phone_number=value).exists():
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
            # Extract password from validated data
            password = validated_data.pop('password')
            
            # Create user instance without saving
            user = CustomUser(**validated_data)
            
            # Set password (this will hash it automatically)
            user.set_password(password)
            
            # Set is_active to False until OTP verification
            user.is_active = False
            
            # Generate OTP
            otp = ''.join(random.choices(string.digits, k=6))
            user.otp = otp
            user.otp_created_at = timezone.now()
            
            # Save the user
            user.save()

            # Send OTP email
            try:
                send_mail(
                    subject='Your Verification Code',
                    message=f'Your verification code is: {otp}. This code will expire in 10 minutes.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                logger.info(f"OTP email sent to {user.email}")
            except Exception as e:
                logger.error(f"Failed to send OTP email to {user.email}: {str(e)}")
                # We still return the user even if email fails
                # The user can request a new OTP later
            
            return user
        except Exception as e:
            logger.error(f"Error in user creation: {str(e)}")
            raise
        
        
# class CustomUserSerializer(UserSerializer):
#     is_shop_owner = serializers.BooleanField(read_only=True)
    
#     class Meta(UserSerializer.Meta):
#         model = CustomUser
#         fields = ('id', 'first_name', 'last_name', 'username', 'email', 
#                  'role', 'is_active', 'is_blocked', 'phone_number', 'is_shop_owner')




class EmailOTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate(self, data):
        try:
            user = CustomUser.objects.get(email=data['email'])
            
            # Check if OTP exists and hasn't expired
            if not user.otp or not user.otp_created_at:
                raise serializers.ValidationError("No OTP found for this account. Please request a new one.")
                
            # Check if OTP has expired (10 minutes)
            if timezone.now() > user.otp_created_at + timezone.timedelta(minutes=10):
                raise serializers.ValidationError("OTP has expired. Please request a new one.")
                
            # Check if OTP matches
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
        User = CustomUser
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
        return value

    def create(self, validated_data):
        User = CustomUser
        email = validated_data['email']
        user = User.objects.get(email=email)
        otp = f"{random.randint(100000, 999999)}"
        user.otp = otp
        user.otp_created_at = timezone.now()
        user.save()
        print(f"OTP: {otp}")  
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
        user.otp = None  # Clear the OTP after successful password reset
        user.save()
        return user