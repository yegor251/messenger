from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Message(models.Model):
    text = models.TextField(max_length=1000)  # Текст сообщения
    timestamp = models.DateTimeField(auto_now_add=True)  # Время отправки
    sender_id = models.BigIntegerField()  # ID отправителя
    recipient_id = models.BigIntegerField()  # ID получателя
    is_read = models.BooleanField(default=False)  # Статус прочтения

    def __str__(self):
        return f"Message from {self.sender_id} to {self.recipient_id} at {self.timestamp}"