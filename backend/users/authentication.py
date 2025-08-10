from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

class CoustomJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        access_token = request.COOKIES.get("access_token")
        
        if not access_token:
            return None
        
        try:
            validated_token = self.get_validated_token(access_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        
        except (InvalidToken, TokenError) as e:
            print(f"Invalid token provided: {e}")
            return None
        
        except AuthenticationFailed as e:
            print(f"Authentication failed: {e}")
            return None
        
        except Exception as e:
            print(f"Unexpected error during authentication: {e}")
            return None
    
    def get_header(self, request):
        """
        Override to prevent conflicts with standard JWT auth
        """
        return None