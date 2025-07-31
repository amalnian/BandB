# shop_tasks.py (add these to your existing tasks.py)
from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from .shop_email_templates import (
    get_shop_registration_template,
    get_shop_forgot_password_template,
    get_shop_resend_otp_template
)
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_shop_otp_email_task(self, email, otp, subject, email_type, shop_name=None, owner_name=None):
    """
    Enhanced Celery task to send shop OTP emails with HTML templates
    """
    try:
        # Generate HTML content based on email type
        if email_type == "shop_registration":
            html_content = get_shop_registration_template(otp, shop_name or "Your Shop", owner_name or "Business Owner")
            plain_message = f'Welcome! Your shop verification code is: {otp}. This code will expire in 10 minutes.'
        
        elif email_type == "shop_forgot_password":
            html_content = get_shop_forgot_password_template(otp, shop_name or "Your Shop", owner_name or "Business Owner")
            plain_message = f'Your shop password reset code is: {otp}. This code will expire in 10 minutes. If you did not request this, please ignore.'
        
        elif email_type == "shop_resend":
            html_content = get_shop_resend_otp_template(otp, shop_name or "Your Shop", owner_name or "Business Owner")
            plain_message = f'Your new shop verification code is: {otp}. This code will expire in 10 minutes.'
        
        else:
            # Fallback template
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2980b9;">🏪 Shop Verification</h2>
                    <p>Hello {owner_name or 'Business Owner'},</p>
                    <p>Your shop verification code is:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #2980b9; letter-spacing: 5px;">{otp}</span>
                    </div>
                    <p style="color: #666;">This code will expire in 10 minutes.</p>
                    <p>Best regards,<br>B&B Team</p>
                </div>
            </body>
            </html>
            """
            plain_message = f'Your shop verification code is: {otp}. This code will expire in 10 minutes.'

        # Create email with both HTML and plain text versions
        email_message = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,  # Plain text version
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email]
        )
        
        # Attach HTML version
        email_message.attach_alternative(html_content, "text/html")
        
        # Send the email
        email_message.send(fail_silently=False)
        
        logger.info(f"Shop OTP email sent successfully to {email} (Type: {email_type})")
        return f"Shop email sent to {email}"
        
    except Exception as e:
        logger.error(f"Failed to send shop OTP email to {email} (Type: {email_type}): {str(e)}")
        
        # Retry the task if max retries not reached
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying shop email send to {email}. Attempt {self.request.retries + 1}")
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
        
        # If all retries failed, log the final failure
        logger.error(f"All retry attempts failed for sending shop email to {email}")
        raise e

@shared_task
def send_shop_registration_otp_task(email, otp, shop_name=None, owner_name=None):
    """
    Task for shop registration OTP with business-focused template
    """
    return send_shop_otp_email_task.delay(
        email=email,
        otp=otp,
        subject="🏪 Welcome! Verify Your Business Registration",
        email_type="shop_registration",
        shop_name=shop_name,
        owner_name=owner_name
    )

@shared_task
def send_shop_forgot_password_otp_task(email, otp, shop_name=None, owner_name=None):
    """
    Task for shop forgot password OTP with security-focused template
    """
    return send_shop_otp_email_task.delay(
        email=email,
        otp=otp,
        subject="🔐 Shop Account Password Reset",
        email_type="shop_forgot_password",
        shop_name=shop_name,
        owner_name=owner_name
    )

@shared_task
def send_shop_resend_otp_task(email, otp, shop_name=None, owner_name=None):
    """
    Task for shop resend OTP with clean template
    """
    return send_shop_otp_email_task.delay(
        email=email,
        otp=otp,
        subject="🔄 New Business Verification Code",
        email_type="shop_resend",
        shop_name=shop_name,
        owner_name=owner_name
    )