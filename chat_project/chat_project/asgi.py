import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from websockets.routing import websocket_urlpatterns
from websockets.middleware import UserAuthMiddleware

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chat_project.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": UserAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
