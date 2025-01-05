from channels.generic.websocket import AsyncWebsocketConsumer
import json
from user_messages.models import Message
from users.models import User
from asgiref.sync import sync_to_async
from django.db.models import Q
from channels.layers import get_channel_layer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_authenticated:
            self.user_group_name = f"user_{self.user.user_id}"
            await self.channel_layer.group_add(self.user_group_name, self.channel_name)
            await self.accept()
            await self.send_all_conversations()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.user.is_authenticated:
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        if action == 'send_message':
            await self.handle_send_message(data)
        elif action == 'mark_as_read':
            await self.mark_as_read(data)
        elif action == 'check_username':
            await self.check_username(data)

    async def check_username(self, data):
        username_to_check = data.get("username")
        if not username_to_check:
            await self.send(json.dumps({"error": "Username is required"}))
            return

        user_exists = await sync_to_async(User.objects.filter(username=username_to_check).exists)()

        response = {
            "action": "check_username",
            "data": {
                "username": username_to_check,
                "exists": user_exists,
            },
        }
        print(response)
        await self.send(json.dumps(response))

    async def mark_as_read(self, data):
        recipient_username = data.get("recipient")

        if not recipient_username:
            await self.send(json.dumps({"error": "Recipient username is required"}))
            return

        try:
            recipient = await sync_to_async(User.objects.get)(username=recipient_username)
        except User.DoesNotExist:
            await self.send(json.dumps({"error": "Recipient not found"}))
            return

        updated_messages = await sync_to_async(Message.objects.filter(
            sender_id=recipient.user_id,
            recipient_id=self.user.user_id,
            is_read=False
        ).update)(is_read=True)

        if updated_messages > 0:
            channel_layer = get_channel_layer()
            sender_group_name = f"user_{recipient.user_id}"
            await channel_layer.group_send(
                sender_group_name,
                {
                    "type": "mark_as_read_event",
                    "message": {
                        "action": "mark_as_read",
                        "reader": self.user.username,
                    },
                },
            )

    async def mark_as_read_event(self, event):
        await self.send(json.dumps({
            "action": "mark_as_read",
            "data": event["message"]
        }))


    async def handle_send_message(self, data):
        sender = self.user
        recipient_username = data.get('recipient')
        text = data.get('text')

        if not text or not recipient_username:
            await self.send(json.dumps({"error": "Invalid message format"}))
            return

        try:
            recipient = await sync_to_async(User.objects.get)(username=recipient_username)
        except User.DoesNotExist:
            await self.send(json.dumps({"error": "Recipient not found"}))
            return

        message = await sync_to_async(Message.objects.create)(
            sender_id=sender.user_id, recipient_id=recipient.user_id, text=text
        )

        # Уведомляем получателя
        channel_layer = get_channel_layer()
        recipient_group_name = f"user_{recipient.user_id}"
        await channel_layer.group_send(
            recipient_group_name,
            {
                "type": "chat_message",
                "message": {
                    "id": message.id,
                    "text": message.text,
                    "timestamp": message.timestamp.isoformat(),
                    "recipient": recipient.username,
                    "sender": sender.username,
                },
            },
        )

    async def chat_message(self, event):
        await self.send(json.dumps({
            "action": "new_message",
            "data": event["message"]
        }))

    async def send_all_conversations(self):
        messages = await sync_to_async(list)(
            Message.objects.filter(Q(sender_id=self.user.user_id) | Q(recipient_id=self.user.user_id))
            .order_by('timestamp')
        )

        conversations = {}
        for msg in messages:
            other_user_id = msg.recipient_id if msg.sender_id == self.user.user_id else msg.sender_id
            other_user = await sync_to_async(User.objects.get)(user_id=other_user_id)
            if other_user.username not in conversations:
                conversations[other_user.username] = []

            sender = await sync_to_async(User.objects.get)(user_id=msg.sender_id)
            recipient = await sync_to_async(User.objects.get)(user_id=msg.recipient_id)

            conversations[other_user.username].append({
                "id": msg.id,
                "text": msg.text,
                "timestamp": msg.timestamp.isoformat(),
                "sender": sender.username,
                "recipient": recipient.username,
                "is_read": msg.is_read,
            })

        await self.send(json.dumps({
            "action": "all_conversations",
            "data": conversations
        }))
