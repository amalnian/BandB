from django.db import models
from users.models import CustomUser as Users
from django.db.models import Prefetch
from django.conf import settings

class ConversationManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().prefetch_related(
            Prefetch('participants', queryset=Users.objects.only('id', 'username'))
        )

class Conversation(models.Model):
    participants = models.ManyToManyField(Users, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    objects = ConversationManager()


    def __str__(self):
        participant_names = " ,".join([user.username for user in self.participants.all()])
        return f'Conversation with {participant_names}'
    
class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(Users, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f'Message from {self.sender.username} in {self.content[:20]}'
    

class Notification(models.Model):
    sender = models.ForeignKey(Users, related_name='sent_notifications', on_delete=models.CASCADE)
    receiver = models.ForeignKey(Users, related_name='received_notifications', on_delete=models.CASCADE)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['receiver', 'is_read']),
            models.Index(fields=['receiver', 'timestamp']),
        ]
    
    def __str__(self):
        return f'From {self.sender.username} to {self.receiver.username} - {self.message[:20]}'