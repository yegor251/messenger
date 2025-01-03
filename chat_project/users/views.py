from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import User
from asgiref.sync import sync_to_async


@csrf_exempt
async def register(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        if not username:
            return JsonResponse({'error': 'Username is required'}, status=400)
        if not password:
            return JsonResponse({'error': 'Password is required'}, status=400)

        # Проверяем существование пользователя
        user_exists = await sync_to_async(User.objects.filter(username=username).exists)()
        if user_exists:
            return JsonResponse({'error': 'Username already exists'}, status=400)

        # Создаём пользователя
        user = await sync_to_async(User.objects.create)(username=username, password=password)
        return JsonResponse({'message': 'User created', 'user_id': user.user_id, 'username': user.username})


@csrf_exempt
async def login(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        try:
            # Получаем пользователя
            user = await sync_to_async(User.objects.get)(username=username)
            # Проверяем пароль
            if user.password == password:
                return JsonResponse({'message': 'Login successful'})
            else:
                return JsonResponse({'error': 'Invalid password'}, status=400)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User does not exist'}, status=404)
