# serializers.py
from djoser.serializers import UserCreateSerializer, UserSerializer
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

class CustomUserCreateSerializer(UserCreateSerializer):
    class Meta(UserCreateSerializer.Meta):
        model = CustomUser
        fields = ('id', 'first_name', 'last_name', 'username', 'email', 'password', 'role', 'phone_number')

    def validate(self, attrs):
        # Always set default role to 'user' even if provided in the request
        attrs['role'] = 'user'
        return super().validate(attrs)

    def create(self, validated_data):
        try:
            user = super().create(validated_data)
            # Set is_active to False until OTP verification
            user.is_active = False
            
            # Generate OTP
            otp = ''.join(random.choices(string.digits, k=6))
            user.otp = otp
            user.otp_created_at = timezone.now()
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
        
class CustomUserSerializer(UserSerializer):
    is_shop_owner = serializers.BooleanField(read_only=True)
    
    class Meta(UserSerializer.Meta):
        model = CustomUser
        fields = ('id', 'first_name', 'last_name', 'username', 'email', 
                 'role', 'is_active', 'is_blocked', 'phone_number', 'is_shop_owner')


class CustomTokenCreateSerializer(TokenObtainPairSerializer):
    username_field = 'email'
    
    def validate(self, attrs):
        # Get the credentials
        email = attrs.get('email')
        
        try:
            # Check if user exists and is active
            user = CustomUser.objects.get(email=email)
            
            if not user.is_active:
                raise serializers.ValidationError({
                    "email": ["Account is not active. Please verify your email."]
                })
            
            if user.is_blocked:
                raise serializers.ValidationError({
                    "email": ["This account has been blocked. Please contact support."]
                })
                
            # Call the parent validation to check password and return token
            data = super().validate(attrs)
            
            # Add custom claims to token
            data['user'] = {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_shop_owner': user.is_shop_owner(),
                'phone_number': user.phone_number,
            }
            
            return data
            
        except CustomUser.DoesNotExist:
            # Let the parent method handle non-existent users
            return super().validate(attrs)


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


# Existing AdminUserSerializer in your code should be modified to match the fields in your React component:
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