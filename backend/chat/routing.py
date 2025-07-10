from django.urls import path
from .import consumers

websocket_urlpatterns = [
    path('ws/chat/<int:conversation_id>', consumers.ChatConsumer.as_asgi()), 
    path('ws/user/<int:user_id>/', consumers.UserConsumer.as_asgi()),    
]