from channels.middleware import BaseMiddleware
from django.db import close_old_connections
from users.models import User
from urllib.parse import parse_qs
from asgiref.sync import sync_to_async

@sync_to_async
def get_user(username, password):
    return User.objects.get(username=username, password=password)

class UserAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_params = parse_qs(scope["query_string"].decode())
        username = query_params.get('username', [None])[0]
        password = query_params.get('password', [None])[0]
        if username and password:
            try:
                user = await get_user(username=username, password=password)
                scope['user'] = user
            except User.DoesNotExist:
                scope['user'] = None
        else:
            scope['user'] = None

        close_old_connections()
        return await super().__call__(scope, receive, send)
