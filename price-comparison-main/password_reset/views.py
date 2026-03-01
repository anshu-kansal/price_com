from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import get_user_model
import json

User = get_user_model()

@csrf_exempt
@require_http_methods(["POST"])
def password_reset_request(request):
    return JsonResponse({'message': 'Password reset request endpoint'})

@csrf_exempt
@require_http_methods(["POST"])
def password_reset_verify(request):
    return JsonResponse({'message': 'Password reset verify endpoint'})

@csrf_exempt
@require_http_methods(["POST"])
def password_reset_confirm(request):
    return JsonResponse({'message': 'Password reset confirm endpoint'})