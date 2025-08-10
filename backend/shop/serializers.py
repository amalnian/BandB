import random
import logging
from rest_framework import serializers
from .models import Booking, BookingFeedback, Shop, ShopImage
from users.models import CustomUser
from shop.models import Service, SpecialClosingDay, BusinessHours
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone

logger = logging.getLogger(__name__)


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
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    email = serializers.EmailField()
    is_active = serializers.BooleanField(read_only=True)
    rating = serializers.FloatField(read_only=True, source='get_average_rating')
    images = ShopImageSerializer(many=True, read_only=True)

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'email', 'phone', 'address', 
            'description', 'owner_name', 'is_active', 
            'is_email_verified', 'is_approved', 'opening_hours', 'rating',
            'username', 'password','images','latitude','longitude'
        ]
        read_only_fields = ['is_email_verified', 'is_approved']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if 'opening_hours' not in representation or representation['opening_hours'] is None:
            representation['opening_hours'] = ""
        return representation

    def validate(self, data):
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
        username = validated_data.pop('username', None)
        password = validated_data.pop('password')
        email = validated_data.get('email')
        
        # Generate username from email if not provided
        if not username and email:
            username_base = email.split('@')[0]
            import random
            username = f"{username_base}{random.randint(100, 999)}"
        
        if not username:
            raise serializers.ValidationError({"username": "Username could not be generated. Please provide an email or username."})
        
        from django.db import transaction
        with transaction.atomic():
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role='shop',
                is_active=False
            )
            
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
        is_active = validated_data.pop('is_active', True)
        
        email = validated_data.get('email')
        user = CustomUser.objects.create_user(
            email=email,
            password=CustomUser.objects.make_random_password(),
            is_active=is_active,
            role='shop'
        )
        
        shop = Shop.objects.create(user=user, **validated_data)
        return shop
    
class ShopUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ['name', 'phone', 'owner_name', 'address', 'description', 'opening_hours']


class ServiceSerializer(serializers.ModelSerializer):
    shop = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description', 'price', 
            'duration_minutes', 'is_active', 'shop'
        ]
        read_only_fields = ['shop']
    
    def validate_name(self, value):
        logger.info(f"Validating name: {value}")
        
        if not value or not value.strip():
            logger.error("Service name is empty")
            raise serializers.ValidationError("Service name cannot be empty.")
        
        cleaned_value = value.strip()
        logger.info(f"Name cleaned: {cleaned_value}")
        return cleaned_value
    
    def validate(self, attrs):
        """Validate that the service name doesn't already exist for this shop (case-insensitive)"""
        logger.info(f"Full validation started with attrs: {attrs}")
        
        name = attrs.get('name')
        if not name:
            logger.info("No name provided, skipping duplicate check")
            return attrs
            
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            logger.error("No authenticated user found in context")
            return attrs
        
        shop = None
        if hasattr(request.user, 'shop'):
            shop = request.user.shop
            logger.info(f"Using user.shop: {shop}")
        else:
            shop = request.user
            logger.info(f"Using user as shop: {shop}")
        
        query = Service.objects.filter(
            shop=shop,
            name__iexact=name.strip()
        )
        
        logger.info(f"Checking for existing services with name '{name}' for shop {shop}")
        
        # If this is an update operation, exclude the current instance
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
            logger.info(f"Update operation - excluding current instance ID: {self.instance.pk}")
        else:
            logger.info("Create operation - checking all services")
        
        existing_services = query.all()
        logger.info(f"Found {len(existing_services)} existing services: {[s.name for s in existing_services]}")
        
        if query.exists():
            error_msg = f'A service with the name "{name}" already exists for this shop.'
            logger.error(error_msg)
            raise serializers.ValidationError({
                'name': error_msg
            })
        
        logger.info("Validation passed successfully")
        return attrs


class BusinessHoursSerializer(serializers.ModelSerializer):
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessHours
        fields = ['id', 'day_of_week', 'day_name', 'opening_time', 'closing_time', 'is_closed']
    
    def get_day_name(self, obj):
        return obj.get_day_of_week_display()
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        if instance.is_closed:
            data['opening_time'] = None
            data['closing_time'] = None
        else:
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
        fields = ['id', 'shop', 'date', 'reason']
        read_only_fields = ['id']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['date'] = instance.date.strftime('%Y-%m-%d')
        return data

    def validate_date(self, value):
        """Ensure the date is not in the past"""
        if value < timezone.now().date():
            raise serializers.ValidationError("Cannot add closing day for past dates.")
        return value
    

class ShopForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validate that shop with this email exists"""
        if not CustomUser.objects.filter(email=value, role='shop').exists():
            raise serializers.ValidationError("No shop found with this email address.")
        return value.lower().strip()

    def validate(self, attrs):
        email = attrs['email']
        try:
            user = CustomUser.objects.get(email=email, role='shop')
            if not user.is_active:
                raise serializers.ValidationError("This shop account is not activated.")
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Shop account not found.")
        
        return attrs

    def save(self):
        """Generate OTP and return user for email processing"""
        email = self.validated_data['email']
        
        try:
            user = CustomUser.objects.get(email=email, role='shop')
            
            # Generate 6-digit OTP
            otp = f"{random.randint(100000, 999999)}"
            
            user.otp = otp
            user.otp_created_at = timezone.now()
            user.save(update_fields=['otp', 'otp_created_at'])
            
            logger.info(f"Shop forgot password OTP generated for {email}")
            return user
            
        except CustomUser.DoesNotExist:
            logger.error(f"Shop user not found for email: {email}")
            raise serializers.ValidationError("Shop account not found.")
        except Exception as e:
            logger.error(f"Error generating OTP for shop {email}: {str(e)}")
            raise serializers.ValidationError("An error occurred. Please try again.")

    def create(self, validated_data):
        """Override create to use save method"""
        return self.save()

class ShopVerifyForgotPasswordOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate_email(self, value):
        return value.lower().strip()

    def validate_otp(self, value):
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("OTP must be a 6-digit number.")
        return value.strip()

    def validate(self, data):
        """Validate OTP against user account"""
        email = data.get('email')
        otp = data.get('otp')
        
        try:
            user = CustomUser.objects.get(email=email, role='shop')
            
            if not user.otp or not user.otp_created_at:
                raise serializers.ValidationError("No OTP found for this account. Please request a new one.")
            
            # Check if OTP has expired (10 minutes)
            if timezone.now() > user.otp_created_at + timezone.timedelta(minutes=10):
                user.otp = None
                user.otp_created_at = None
                user.save(update_fields=['otp', 'otp_created_at'])
                raise serializers.ValidationError("OTP has expired. Please request a new one.")
            
            if user.otp != otp:
                raise serializers.ValidationError("Invalid OTP. Please try again.")
                
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Shop account not found.")
        
        return data

class ShopResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        return value.lower().strip()

    def validate_otp(self, value):
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("OTP must be a 6-digit number.")
        return value.strip()

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        
        import re
        if not re.search(r'[A-Za-z]', value) or not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one letter and one number.")
        
        return value

    def validate(self, data):
        """Validate OTP and password confirmation"""
        email = data.get('email')
        otp = data.get('otp')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if new_password != confirm_password:
            raise serializers.ValidationError("Password and confirm password do not match.")
        
        try:
            user = CustomUser.objects.get(email=email, role='shop')
            
            if not user.otp or not user.otp_created_at:
                raise serializers.ValidationError("No OTP found for this account. Please request a new one.")
            
            # Check if OTP has expired (10 minutes)
            if timezone.now() > user.otp_created_at + timezone.timedelta(minutes=10):
                user.otp = None
                user.otp_created_at = None
                user.save(update_fields=['otp', 'otp_created_at'])
                raise serializers.ValidationError("OTP has expired. Please request a new one.")
            
            if user.otp != otp:
                raise serializers.ValidationError("Invalid OTP. Please try again.")
                
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Shop account not found.")
        
        return data

    def save(self):
        """Reset password and clear OTP"""
        email = self.validated_data['email']
        new_password = self.validated_data['new_password']
        
        try:
            user = CustomUser.objects.get(email=email, role='shop')
            
            user.set_password(new_password)
            
            # Clear OTP after successful password reset
            user.otp = None
            user.otp_created_at = None
            user.save()
            
            logger.info(f"Password reset successful for shop: {email}")
            return user
            
        except CustomUser.DoesNotExist:
            logger.error(f"Shop user not found during password reset: {email}")
            raise serializers.ValidationError("Shop account not found.")
        except Exception as e:
            logger.error(f"Error resetting password for shop {email}: {str(e)}")
            raise serializers.ValidationError("An error occurred while resetting password.")

    def update(self, instance, validated_data):
        """Override update to use save method"""
        return self.save()
    

class BookingSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    services = ServiceSerializer(many=True, read_only=True)
    
    has_feedback = serializers.SerializerMethodField()
    can_give_feedback = serializers.SerializerMethodField()
    feedback = serializers.SerializerMethodField()
    can_be_completed = serializers.SerializerMethodField()
    is_appointment_time_passed = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'user_name', 'user_email', 'user_phone', 'shop_name',
            'services', 'appointment_date', 'appointment_time', 'total_amount',
            'booking_status', 'payment_status', 'payment_method', 'notes',
            'created_at', 'updated_at', 'has_feedback', 'can_give_feedback',
            'feedback', 'can_be_completed', 'is_appointment_time_passed'
        ]

    def get_services(self, obj):
        """Get services for this booking"""
        return [
            {
                'name': service.name,
                'price': str(service.price)
            }
            for service in obj.services.all()
        ]
    
    def get_has_feedback(self, obj):
        return obj.has_feedback()
    
    def get_can_give_feedback(self, obj):
        return obj.can_give_feedback()
    
    def get_can_be_completed(self, obj):
        return obj.can_be_completed()
    
    def get_is_appointment_time_passed(self, obj):
        return obj.is_appointment_time_passed()
    
    def get_feedback(self, obj):
        """Get feedback details if exists"""
        try:
            if hasattr(obj, 'feedback') and obj.feedback:
                return {
                    'id': obj.feedback.id,
                    'rating': obj.feedback.rating,
                    'feedback_text': obj.feedback.feedback_text,
                    'service_quality': obj.feedback.service_quality,
                    'staff_behavior': obj.feedback.staff_behavior,
                    'cleanliness': obj.feedback.cleanliness,
                    'value_for_money': obj.feedback.value_for_money,
                    'created_at': obj.feedback.created_at,
                }
            return None
        except:
            return None
        

class BookingFeedbackSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    booking_date = serializers.DateField(source='booking.appointment_date', read_only=True)
    booking_time = serializers.TimeField(source='booking.appointment_time', read_only=True)
    
    class Meta:
        model = BookingFeedback
        fields = [
            'id',
            'booking',
            'user',
            'shop',
            'rating',
            'feedback_text',
            'service_quality',
            'staff_behavior',
            'cleanliness',
            'value_for_money',
            'created_at',
            'updated_at',
            'user_name',
            'user_email',
            'shop_name',
            'booking_date',
            'booking_time',
        ]
        read_only_fields = [
            'id',
            'booking',
            'user',
            'shop',
            'created_at',
            'updated_at',
            'user_name',
            'user_email',
            'shop_name',
            'booking_date',
            'booking_time',
        ]
    
    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def validate_service_quality(self, value):
        if value and not (1 <= value <= 5):
            raise serializers.ValidationError("Service quality rating must be between 1 and 5")
        return value
    
    def validate_staff_behavior(self, value):
        if value and not (1 <= value <= 5):
            raise serializers.ValidationError("Staff behavior rating must be between 1 and 5")
        return value
    
    def validate_cleanliness(self, value):
        if value and not (1 <= value <= 5):
            raise serializers.ValidationError("Cleanliness rating must be between 1 and 5")
        return value
    
    def validate_value_for_money(self, value):
        if value and not (1 <= value <= 5):
            raise serializers.ValidationError("Value for money rating must be between 1 and 5")
        return value


class BookingFeedbackSummarySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    
    class Meta:
        model = BookingFeedback
        fields = [
            'id',
            'rating',
            'feedback_text',
            'created_at',
            'user_name',
            'shop_name',
        ]


class BookingWithFeedbackSerializer(serializers.ModelSerializer):
    feedback = BookingFeedbackSerializer(read_only=True)
    has_feedback = serializers.SerializerMethodField()
    can_give_feedback = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = [
            'id',
            'shop_name',
            'appointment_date',
            'appointment_time',
            'booking_status',
            'payment_status',
            'total_amount',
            'created_at',
            'feedback',
            'has_feedback',
            'can_give_feedback',
        ]
    
    def get_has_feedback(self, obj):
        return obj.has_feedback()
    
    def get_can_give_feedback(self, obj):
        return obj.can_give_feedback()