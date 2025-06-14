import random
from rest_framework import serializers
from .models import Shop, ShopImage
from users.models import CustomUser
from shop.models import Service, Notification, SpecialClosingDay, BusinessHours
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role  
        return token

class ShopImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopImage
        fields = ['id', 'image_url', 'public_id', 'width', 'height', 'is_primary', 'order', 'created_at']

class ShopSerializer(serializers.ModelSerializer):
    # Add fields for user creation
    username = serializers.CharField(write_only=True, required=False)  # Make username optional
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    email = serializers.EmailField()  # Override to make it writable during creation
    is_active = serializers.BooleanField(read_only=True)
    rating = serializers.FloatField(read_only=True, source='get_average_rating')
    images = ShopImageSerializer(many=True, read_only=True)

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'email', 'phone', 'address', 
            'description', 'owner_name', 'is_active', 
            'is_email_verified', 'is_approved', 'opening_hours', 'rating',
            'username', 'password','images','latitude','longitude'  # Added for user creation
        ]
        read_only_fields = ['is_email_verified', 'is_approved']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Add any missing fields that the frontend expects but aren't in the model
        if 'opening_hours' not in representation or representation['opening_hours'] is None:
            representation['opening_hours'] = ""
        return representation

    def validate(self, data):
    # Validate coordinates if provided
        if data.get('latitude') and data.get('longitude'):
            lat = float(data['latitude'])
            lng = float(data['longitude'])
            if not (-90 <= lat <= 90):
                raise serializers.ValidationError("Latitude must be between -90 and 90")
            if not (-180 <= lng <= 180):
                raise serializers.ValidationError("Longitude must be between -180 and 180")
        return data

    def create(self, validated_data):
        """Create both CustomUser and Shop in a single transaction"""
        # Extract user-related fields
        username = validated_data.pop('username', None)
        password = validated_data.pop('password')
        email = validated_data.get('email')  # Keep in validated_data for shop
        
        # If username is not provided, generate one from email
        if not username and email:
            username_base = email.split('@')[0]
            import random
            username = f"{username_base}{random.randint(100, 999)}"
        
        if not username:
            raise serializers.ValidationError({"username": "Username could not be generated. Please provide an email or username."})
        
        # Create user first
        from django.db import transaction
        with transaction.atomic():
            # Import User model here to avoid circular imports
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Create the user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role='shop',  # Set the role directly
                is_active=False  # We'll handle activation via email verification
            )
            
            # Create the shop
            shop = Shop.objects.create(user=user, **validated_data)
            
        return shop


class AdminShopSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField()
    rating = serializers.FloatField(read_only=True, source='get_average_rating')
    
    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'email', 'phone', 'address', 
            'description', 'owner_name', 'is_active',
            'is_email_verified', 'is_approved', 'opening_hours', 'rating'
        ]
    
    def update(self, instance, validated_data):
        # Handle is_active which is actually a property of the user model
        is_active = validated_data.pop('is_active', None)
        if is_active is not None:
            instance.user.is_active = is_active
            instance.user.save(update_fields=['is_active'])
            
        return super().update(instance, validated_data)
        
    def create(self, validated_data):
        # Extract is_active for the user
        is_active = validated_data.pop('is_active', True)
        
        # Create a new user for this shop
        email = validated_data.get('email')
        user = CustomUser.objects.create_user(
            email=email,
            password=CustomUser.objects.make_random_password(),  # Generate random password
            is_active=is_active,
            role='shop'
        )
        
        # Create the shop with the new user
        shop = Shop.objects.create(user=user, **validated_data)
        return shop
    
class ShopUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating shop details.
    """
    class Meta:
        model = Shop
        fields = ['name', 'phone', 'owner_name', 'address', 'description', 'opening_hours']


class ServiceSerializer(serializers.ModelSerializer):
    """
    Serializer for shop services.
    """
    shop = serializers.StringRelatedField(read_only=True)  # Make shop read-only
    
    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description', 'price', 
            'duration_minutes', 'is_active', 'shop'
        ]
        read_only_fields = ['shop']  # Ensure shop cannot be set via API

# class AppointmentSerializer(serializers.ModelSerializer):
#     """
#     Serializer for appointments, with some nested data for display.
#     """
#     customer_name = serializers.CharField(source='customer.name', read_only=True)
#     service_name = serializers.CharField(source='service.name', read_only=True)
    
#     class Meta:
#         model = Appointment
#         fields = [
#             'id', 'customer', 'customer_name', 'service', 'service_name',
#             'start_time', 'end_time', 'status', 'notes', 'price'
#         ]
        
#     def to_representation(self, instance):
#         # Override to format data as expected by the frontend
#         data = super().to_representation(instance)
#         # Format time as expected by frontend (e.g., "10:00 AM")
#         data['time'] = instance.start_time.strftime("%I:%M %p") if instance.start_time else None
#         # Keep both service (ID) and service_name (display name)
#         data['service_display'] = data.pop('service_name')
#         return data


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for shop notifications with human-readable time.
    """
    time = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ['id', 'message', 'read', 'time']
    
    def get_time(self, obj):
        # Return the human-readable time ago
        return obj.time_ago()
    

class BusinessHoursSerializer(serializers.ModelSerializer):
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessHours
        fields = ['id', 'day_of_week', 'day_name', 'opening_time', 'closing_time', 'is_closed']
    
    def get_day_name(self, obj):
        return obj.get_day_of_week_display()
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # First check if closed, then handle time formatting
        if instance.is_closed:
            data['opening_time'] = None
            data['closing_time'] = None
        else:
            # Only format times if they exist
            if instance.opening_time:
                try:
                    data['opening_time'] = instance.opening_time.strftime('%H:%M')
                except AttributeError:
                    # In case opening_time is already a string
                    data['opening_time'] = instance.opening_time
            else:
                data['opening_time'] = None
                
            if instance.closing_time:
                try:
                    data['closing_time'] = instance.closing_time.strftime('%H:%M')
                except AttributeError:
                    # In case closing_time is already a string
                    data['closing_time'] = instance.closing_time
            else:
                data['closing_time'] = None
                
        return data
    


class SpecialClosingDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecialClosingDay
        fields = ['id', 'date', 'reason']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['date'] = instance.date.strftime('%Y-%m-%d')
        return data
    

class ShopForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value, role='shop').exists():
            raise serializers.ValidationError("No shop found with this email address.")
        return value

    def create(self, validated_data):
        email = validated_data['email']
        user = CustomUser.objects.get(email=email, role='shop')
        otp = f"{random.randint(100000, 999999)}"
        user.otp = otp
        user.save()
        print(f"Shop Password Reset OTP for {user.email}: {otp}")  # Print OTP in terminal
        return user

class ShopVerifyForgotPasswordOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate(self, data):
        email = data.get('email')
        otp = data.get('otp')
        
        try:
            user = CustomUser.objects.get(email=email, role='shop')
            if user.otp != otp:
                raise serializers.ValidationError("Invalid OTP")
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Shop not found")
        
        return data

class ShopResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        otp = data.get('otp')
        new_password = data.get('new_password')
        
        try:
            user = CustomUser.objects.get(email=email, role='shop')
            if user.otp != otp:
                raise serializers.ValidationError("Invalid OTP")
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Shop not found")
        
        return data

    def update(self, instance, validated_data):
        user = CustomUser.objects.get(email=validated_data['email'], role='shop')
        user.set_password(validated_data['new_password'])
        user.otp = None  # Clear the OTP after successful password reset
        user.save()
        return user 