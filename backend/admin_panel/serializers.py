# serializers.py
from rest_framework import serializers
from shop.models import Shop
from users.models import CustomUser

# This would typically be in shop/serializers.py
class AdminShopSerializer(serializers.ModelSerializer):
    """
    Serializer for admin to manage shops with full access to all fields
    """
    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'address', 'phone', 'email', 
            'description', 'opening_hours', 'is_approved', 
            'is_email_verified', 'created_at', 
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    # Include the active status from the linked user
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['is_active'] = instance.user.is_active if hasattr(instance, 'user') else False
        return representation


# This would typically be in users/serializers.py
class AdminUserSerializer(serializers.ModelSerializer):
    """
    Serializer for admin to manage users with full access
    """
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'role', 'date_joined', 'last_login'
        ]
        read_only_fields = ['date_joined', 'last_login']


class UserStatusSerializer(serializers.Serializer):
    """
    Serializer for toggling user active status
    """
    is_active = serializers.BooleanField(required=True)
    
    def update(self, instance, validated_data):
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.save()
        return instance