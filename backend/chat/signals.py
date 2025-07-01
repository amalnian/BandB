
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Message
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync,sync_to_async
import json
from django.core.cache import cache
from .models import Notification  


@receiver(post_save, sender=Message)
def send_message_notification(sender, instance, created, **kwargs):
    if not created:
        return 
    channel_layer = get_channel_layer()
    data = {
        'type': 'notification',
        'message': {
            'sender': instance.sender.username,
            'content': instance.content,
            'timestamp': instance.timestamp.isoformat(),
        }
    }

    for user in instance.conversation.participants.all():
        ONLINE_USERS = f'chat:online_users'
        curr_users = cache.get(ONLINE_USERS, []) 
        if user.id in [user["id"] for user in curr_users]:
            if user.id != instance.sender.id:
                async_to_sync(channel_layer.group_send)(
                    f'user_{user.id}',
                    data
                )
        else:
            if user.id != instance.sender.id:
                async_to_sync(save_notification)(
                    sender=instance.sender,
                    receiver=user,
                    message=instance.content
                )
            
@sync_to_async
def save_notification(sender, receiver, message):
    Notification.objects.create(
        sender=sender,
        receiver=receiver,
        message=message
    )