from celery import shared_task
from django.utils import timezone
from shop.models import TemporarySlotReservation
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@shared_task
def cleanup_expired_reservations():
    """Celery task to clean up expired reservations"""
    deleted_count = TemporarySlotReservation.objects.filter(
        expires_at__lt=timezone.now()
    ).delete()[0]
    return f"Cleaned up {deleted_count} expired reservations"


@shared_task
def send_otp_email_task(email, otp, subject="Your Verification Code"):
    """
    Celery task to send OTP email asynchronously
    """
    try:
        message = f'Your verification code is: {otp}. This code will expire in 10 minutes.'
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"OTP email sent successfully to {email}")
        return f"Email sent to {email}"
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {str(e)}")
        raise e

@shared_task
def send_registration_otp_task(email, otp):
    """
    Specific task for registration OTP
    """
    return send_otp_email_task.delay(email, otp, "Your Registration Verification Code")

@shared_task
def send_forgot_password_otp_task(email, otp):
    """
    Specific task for forgot password OTP
    """
    return send_otp_email_task.delay(email, otp, "Your Password Reset Code")