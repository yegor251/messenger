from django.db import models

class User(models.Model):
    user_id = models.BigAutoField(primary_key=True)  # BIGSERIAL
    username = models.CharField(max_length=255, unique=True)  # Уникальное имя пользователя
    password = models.CharField(max_length=255)  # Хэшированный пароль

    def __str__(self):
        return f"User {self.user_id} - {self.username}"

    @property
    def is_authenticated(self):
        return True