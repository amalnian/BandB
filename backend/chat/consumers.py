from channels.db import database_sync_to_async
from channels_redis.core import RedisChannelLayer
import json 
import jwt 
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.conf import settings
from urllib.parse import parse_qs
from django.core.exceptions import PermissionDenied
from django.core.cache import cache


class ChatConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        query_string = self.scope['query_string'].decode()
        params = parse_qs(query_string)
        user_id = params.get('user_id', [None])[0]

        if not user_id:
            await self.close(code=4003)
            return

        try:
            self.user = await self.get_user(int(user_id))
            self.scope['user'] = self.user
        except Exception as e:
            print(f"User lookup failed: {e}")
            await self.close(code=4004)
            return

        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        self.scope['conversation_id'] = self.conversation_id
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        ONLINE_USERS = f'chat:online_users_{self.conversation_id}'
        curr_users = cache.get(ONLINE_USERS, [])

        new_user = {
            "id": self.user.id,
            "username": self.user.username
        }

        if new_user not in curr_users:
            curr_users.append(new_user)

        cache.set(ONLINE_USERS, curr_users, timeout=None)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'online_status',
                'online_users': curr_users,
                'status': 'online',
            }
        )


    async def disconnect(self, close_code):

        if hasattr(self, 'room_group_name'):
            user = self.scope["user"]
            conversation_id = self.scope["conversation_id"]
            ONLINE_USERS = f'chat:online_users_{conversation_id}'
            curr_users = cache.get(ONLINE_USERS, [])

            curr_users = [u for u in curr_users if u['id'] != user.id]

            cache.set(ONLINE_USERS, curr_users, timeout=None)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'online_status',
                    'online_users': curr_users,
                    'status': 'offline',
                }
            )

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )


    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        event_type = text_data_json.get('type')
        if event_type == 'chat_message':
            message_content = text_data_json.get('message')
            user_id = text_data_json.get('user')

            try:
                user = await self.get_user(user_id)
                conversation = await self.get_conversation(self.conversation_id)
                from .serializer import UserListSerializer
                user_data = UserListSerializer(user).data
                message = await self.save_message(conversation, user, message_content)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'id': message.id,
                        'message': message.content,
                        'user': user_data,
                        'timestamp': message.timestamp.isoformat(),
                    }
                )
            except Exception as e:
                print(f"Error saving message: {e}")
        
        elif event_type == 'typing':
            try:
                user_data = await self.get_user_data(self.scope['user'])
                receiver_id = text_data_json.get('receiver')

                if receiver_id is not None:
                    if isinstance(receiver_id, (str, int, float)):
                        receiver_id = int(receiver_id)

                        if receiver_id != self.scope['user'].id:
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'typing',
                                    'user': user_data,
                                    'receiver': receiver_id,
                                }
                            )
                        else:
                            print(f"User is typing for themselves")
                    else:
                        print(f"Invalid receiver ID: {type(receiver_id)}")
                else:
                    print("No receiver ID provided")
            except ValueError as e:
                print(f"Error parsing receiver ID: {e}")
            except Exception as e:
                print(f"Error getting user data: {e}")
                
        elif event_type == 'delete_message':
            try:
                message_id = text_data_json.get('message_id')
                user = self.scope['user']

                deleted = await self.delete_message(message_id, user)
                if deleted:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'message_deleted',
                            'message_id': message_id,
                        }
                    )
            except PermissionDenied as e:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'error': str(e)
                }))
            except Exception as e:
                print(f"Error deleting message: {e}")


    # helper functions
    async def chat_message(self, event):
        id = event['id']
        message = event['message']
        user = event['user']
        timestamp = event['timestamp']
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'id': id,
            'message': message,
            'user': user,
            'timestamp': timestamp,
        }))
    
    async def typing(self, event):
        user = event['user']
        receiver = event.get('receiver')
        is_typing = event.get('is_typing', False)
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user': user,
            'receiver': receiver,
            'is_typing': is_typing,
        }))

    async def online_status(self, event):
        
        await self.send(text_data=json.dumps(event))
    
    async def message_deleted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
        }))

    async def get_online_users(self):
        users = await self.channel_layer.redis.smembers("chat:online_users")
        online_users = []
        for user in users:
            try:
                online_users.append(json.loads(user))
            except json.JSONDecodeError:
                continue
        return online_users

    
    @database_sync_to_async
    def get_user(self, user_id): 
        from users.models import CustomUser as Users
        return Users.objects.get(id=user_id)

    @database_sync_to_async
    def get_user_data(self, user):
        from .serializer import UserListSerializer
        return UserListSerializer(user).data

    @database_sync_to_async
    def get_conversation(self, conversation_id):
        from .models import Conversation
        try:
            return Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            print(F"Conversation with id {conversation_id} does not exist")
            return None

    @database_sync_to_async
    def save_message(self, conversation, user, content):
        from .models import Message
        return Message.objects.create(
            conversation=conversation,
            sender=user,
            content=content
        )
        
    @database_sync_to_async
    def delete_message(self, message_id, user):
        from .models import Message
        from django.core.exceptions import PermissionDenied
        message = Message.objects.get(id=message_id)
        if message.sender != user:
            raise PermissionDenied("You can't delete this message")
        message.delete()
        return True


class UserConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.user_group_name = f'user_{self.user_id}'

        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        await self.accept()
               
        ONLINE_USERS = f'chat:online_users'
        curr_users = await sync_to_async(cache.get)(ONLINE_USERS, [])
        self.user = await self.get_user(self.user_id)

        self.scope['user'] = self.user

        new_user = {
            "id": self.user.id,
            "username": self.user.username
        }

        if new_user not in curr_users:
            curr_users.append(new_user)
            await sync_to_async(cache.set)(ONLINE_USERS, curr_users, timeout=None)
        
        await self.send_unsent_notifications()

    async def disconnect(self, close_code):
        
        user = self.scope["user"]
        ONLINE_USERS = f'chat:online_users'
        curr_users = await sync_to_async(cache.get)(ONLINE_USERS, [])

        curr_users = [u for u in curr_users if u['id'] != user.id]
        await sync_to_async(cache.set)(ONLINE_USERS, curr_users, timeout=None)
        
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )

    async def notification(self, event):
        await self.send(text_data=json.dumps({
            "type": "notification",
            "message": event["message"]
        }))
        
    @database_sync_to_async
    def get_user(self, user_id): 
        from users.models import CustomUser as Users
        return Users.objects.get(id=user_id)
    
    async def send_unsent_notifications(self):
        notifications = await self.get_user_notifications(self.user)
        for n in notifications:
            await self.send(text_data=json.dumps({
                "type": "notification",
                "message": {
                    "sender": n.sender.username,
                    "content": n.message,
                    "timestamp": n.timestamp.isoformat(),
                }
            }))
        await self.clear_user_notifications(self.user)

    @database_sync_to_async
    def get_user_notifications(self, user):
        from .models import Notification
        return list(Notification.objects.filter(receiver=user).select_related('sender'))

    @database_sync_to_async
    def clear_user_notifications(self, user):
        from .models import Notification
        Notification.objects.filter(receiver=user).delete()