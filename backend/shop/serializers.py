# # shop/serializers.py
# from rest_framework import serializers
# from .models import Shop
# from users.models import CustomUser
# from django.db import transaction

# class ShopSerializer(serializers.ModelSerializer):
#     password = serializers.CharField(write_only=True, required=True)
#     email = serializers.EmailField(required=True)
#     username = serializers.CharField(required=False, allow_blank=True)
    
#     class Meta:
#         model = Shop
#         fields = ['name', 'email', 'phone', 'address', 'description', 'owner_name', 'password', 'username']
        
#     def validate(self, attrs):
#         """Validate the data before creating objects"""
#         # Check if email already exists
#         email = attrs.get('email')
#         if CustomUser.objects.filter(email=email).exists():
#             raise serializers.ValidationError({"email": "A user with this email already exists."})
            
#         # If username is not provided, generate one from email
#         if not attrs.get('username'):
#             attrs['username'] = email.split('@')[0]
            
#         return attrs
        
#     @transaction.atomic
#     def create(self, validated_data):
#         # Extract user-related fields
#         password = validated_data.pop('password')
#         email = validated_data.pop('email')
#         username = validated_data.pop('username', None) or email.split('@')[0]
        
#         # Create a user for this shop
#         user = CustomUser.objects.create_user(
#             username=username,
#             email=email,
#             password=password,
#             is_active=False,  # Start as inactive until email verification
#             role='shop'  # Set role to shop
#         )
        
#         # Create the shop linked to the user
#         shop = Shop.objects.create(
#             user=user,
#             email=email,  # We need to explicitly set email here
#             **validated_data
#         )
        
#         return shop



from rest_framework import serializers
from .models import Shop
from users.models import CustomUser
from shop.models import Service, Appointment, Notification

class ShopSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)
    rating = serializers.FloatField(read_only=True, source='get_average_rating')
    
    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'email', 'phone', 'address', 
            'description', 'owner_name', 'is_active', 
            'is_email_verified', 'is_approved', 'opening_hours', 'rating'
        ]
        read_only_fields = ['email', 'is_email_verified', 'is_approved']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Add any missing fields that the frontend expects but aren't in the model
        if 'opening_hours' not in representation:
            representation['opening_hours'] = ""
        return representation


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
    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description', 'price', 
            'duration_minutes', 'is_active'
        ]


class AppointmentSerializer(serializers.ModelSerializer):
    """
    Serializer for appointments, with some nested data for display.
    """
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'customer', 'customer_name', 'service', 'service_name',
            'scheduled_time', 'end_time', 'status', 'notes', 'price'
        ]
        
    def to_representation(self, instance):
        # Override to format data as expected by the frontend
        data = super().to_representation(instance)
        # Format time as expected by frontend (e.g., "10:00 AM")
        data['time'] = instance.scheduled_time.strftime("%I:%M %p")
        # Rename service_name to service for frontend compatibility
        data['service'] = data.pop('service_name')
        return data


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