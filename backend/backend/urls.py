from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Django's built-in admin interface
    path('admin/', admin.site.urls),
    
    # Authentication endpoints
    path('api/auth/', include('djoser.urls')),
    path('api/auth/', include('djoser.urls.jwt')),
    
    # Custom user endpoints
    path('api/auth/', include('users.urls')),
    
    # Custom admin panel endpoints - renamed to avoid conflict
    path('api/admin/', include('admin_panel.urls')),  # Rename your app to 'admin_panel' instead of 'admin'
    path('api/auth/', include('shop.urls')),  
]