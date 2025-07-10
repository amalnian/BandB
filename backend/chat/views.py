from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404

from users.models import CustomUser as Users
from .models import Conversation
from .serializer import *

class ConversationAPIView(APIView):

    def get(self, request):
        conversations = Conversation.objects.filter(participants=request.user)
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)

    def post(self, request):
        participants_data = request.data.get('participants', [])

        if len(participants_data) != 2:
            return Response({'error': 'A conversation needs exactly two participants'},
                            status=status.HTTP_400_BAD_REQUEST)

        if str(request.user.id) not in map(str, participants_data):
            return Response({'error': 'You must be a participant'},
                            status=status.HTTP_403_FORBIDDEN)

        users = Users.objects.filter(id__in=participants_data)
        if users.count() != 2:
            return Response({'error': 'Invalid participants'},
                            status=status.HTTP_400_BAD_REQUEST)

        existing_conversation = Conversation.objects.filter(
            participants__id=participants_data[0]
        ).filter(participants__id=participants_data[1]).distinct()

        if existing_conversation.exists():
            return Response({'error': 'Conversation already exists'},
                            status=status.HTTP_400_BAD_REQUEST)

        conversation = Conversation.objects.create()
        conversation.participants.set(users)

        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class MessageAPIView(APIView):

    def get_conversation(self, conversation_id, user):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        if user not in conversation.participants.all():
            raise PermissionDenied("You are not a participant")
        return conversation

    def get(self, request, conversation_id):
        conversation = self.get_conversation(conversation_id, request.user)
        messages = conversation.messages.order_by('timestamp')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, conversation_id):
        conversation = self.get_conversation(conversation_id, request.user)
        serializer = CreateMessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(sender=request.user, conversation=conversation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MessageDetailAPIView(APIView):

    def get(self, request, conversation_id, pk):
        message = get_object_or_404(Message, pk=pk, conversation__id=conversation_id)
        serializer = MessageSerializer(message)
        return Response(serializer.data)
