from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Message
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync, sync_to_async
import json
from django.core.cache import cache
from chat.models import Notification  


@receiver(post_save, sender=Message)
def send_message_notification(sender, instance, created, **kwargs):
    if not created:
        return 
    
    print(f"📨 Signal triggered for message: {instance.content[:50]}...")
    
    channel_layer = get_channel_layer()
    data = {
        'type': 'notification',  # This must match the method name in your consumer
        'message': {
            'sender': instance.sender.username,
            'sender_id': instance.sender.id,
            'content': instance.content,
            'timestamp': instance.timestamp.isoformat(),
            'conversation_id': instance.conversation.id,  # Add conversation ID
            'conversation_type': 'direct' if instance.conversation.participants.count() == 2 else 'group',  # Add conversation type
            'conversation_name': getattr(instance.conversation, 'name', None) or f"Chat with {instance.sender.username}",  # Add conversation name
        }
    }

    for user in instance.conversation.participants.all():
        print(f"🔍 Checking user {user.id} ({user.username})")
        
        ONLINE_USERS = f'chat:online_users'
        curr_users = cache.get(ONLINE_USERS, []) 
        online_user_ids = [user_data["id"] for user_data in curr_users]
        
        print(f"👥 Online users: {online_user_ids}")
        
        if user.id in online_user_ids:
            if user.id != instance.sender.id:
                print(f"📤 Sending real-time notification to user {user.id}")
                try:
                    async_to_sync(channel_layer.group_send)(
                        f'user_{user.id}',
                        data
                    )
                    print(f"✅ Notification sent to user {user.id}")
                except Exception as e:
                    print(f"❌ Failed to send notification to user {user.id}: {e}")
        else:
            if user.id != instance.sender.id:
                print(f"💾 Saving notification for offline user {user.id}")
                try:
                    async_to_sync(save_notification)(
                        sender=instance.sender,
                        receiver=user,
                        message=instance.content,
                        conversation_id=instance.conversation.id  # Pass conversation ID
                    )
                    print(f"✅ Notification saved for user {user.id}")
                except Exception as e:
                    print(f"❌ Failed to save notification for user {user.id}: {e}")
            
@sync_to_async
def save_notification(sender, receiver, message, conversation_id):
    Notification.objects.create(
        sender=sender,
        receiver=receiver,
        message=message,
        conversation_id=conversation_id  # Store conversation ID in notification
    )