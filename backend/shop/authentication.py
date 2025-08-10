# authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth.models import AnonymousUser
import logging

logger = logging.getLogger(__name__)

class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that reads the JWT token from cookies
    """
    
    def authenticate(self, request):
        raw_token = request.COOKIES.get('access_token')
        
        logger.debug(f"Cookie authentication attempt. Token found: {'Yes' if raw_token else 'No'}")
        
        if raw_token is None:
            logger.debug("No token in cookies, trying header method")
            return super().authenticate(request)
        
        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            logger.debug(f"Cookie authentication successful for user: {user.username}")
            return (user, validated_token)
        except InvalidToken as e:
            logger.warning(f"Invalid token from cookie: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Cookie authentication error: {str(e)}")
            return None
    
    def get_validated_token(self, raw_token):
        """
        Validates an encoded JSON Web Token and returns a validated token wrapper object.
        """
        return super().get_validated_token(raw_token)