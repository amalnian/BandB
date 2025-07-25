from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/admin/', include('admin_panel.urls')), 
    path('api/auth/', include('shop.urls')),  
    path('api/chat/', include('chat.urls')),  
]