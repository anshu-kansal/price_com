# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework import status
# from django.contrib.auth import authenticate, login, logout
# from django.contrib.auth.models import User
# from .serializers import RegisterSerializer, GoogleAuthSerializer
# from .models import UserProfile

# # ✅ REGISTER VIEW - FIXED
# class RegisterView(APIView):
#     def post(self, request):
#         serializer = RegisterSerializer(data=request.data)
#         if serializer.is_valid():
#             try:
#                 user = serializer.save()
#                 return Response(
#                     {
#                         "message": "Registration successful", 
#                         "success": True,
#                         "username": user.username,
#                         "email": user.email,
#                         "role": user.profile.role
#                     },
#                     status=status.HTTP_201_CREATED
#                 )
#             except Exception as e:
#                 return Response(
#                     {"error": str(e), "success": False},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# # ✅ LOGIN VIEW - FIXED
# class LoginView(APIView):
#     def post(self, request):
#         username = request.data.get("username")
#         password = request.data.get("password")

#         if not username or not password:
#             return Response(
#                 {"error": "Username and password required", "success": False},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         user = authenticate(request, username=username, password=password)

#         if user is None:
#             return Response(
#                 {"error": "Invalid username or password", "success": False},
#                 status=status.HTTP_401_UNAUTHORIZED
#             )

#         # Log the user in (creates session)
#         login(request, user)

#         # Check if profile exists
#         try:
#             profile = user.profile
#         except UserProfile.DoesNotExist:
#             profile = UserProfile.objects.create(user=user, role='viewer')

#         return Response(
#             {
#                 "message": "Login successful",
#                 "success": True,
#                 "username": user.username,
#                 "email": user.email,
#                 "is_admin": profile.role == 'admin',
#                 "role": profile.role,
#                 "user_id": user.id
#             },
#             status=status.HTTP_200_OK
#         )

# # ✅ GOOGLE LOGIN VIEW - FIXED
# class GoogleLoginView(APIView):
#     def post(self, request):
#         serializer = GoogleAuthSerializer(data=request.data)
        
#         if not serializer.is_valid():
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
#         email = serializer.validated_data['email']
#         google_id = serializer.validated_data['sub']
        
#         try:
#             user = User.objects.get(email=email)
#             # Profile should exist from signal, but check just in case
#             try:
#                 profile = user.profile
#             except UserProfile.DoesNotExist:
#                 profile = UserProfile.objects.create(user=user, role='viewer')
                
#         except User.DoesNotExist:
#             # Create new user
#             username = email.split('@')[0]
#             base_username = username
#             counter = 1
            
#             while User.objects.filter(username=username).exists():
#                 username = f"{base_username}{counter}"
#                 counter += 1
            
#             user = User.objects.create_user(
#                 username=username,
#                 email=email,
#                 password=None
#             )
            
#             # Profile will be auto-created by signal, then update role
#             user.profile.role = 'viewer'
#             user.profile.save()
        
#         # Log the user in
#         login(request, user)
        
#         return Response(
#             {
#                 "message": "Google login successful",
#                 "success": True,
#                 "username": user.username,
#                 "email": user.email,
#                 "is_admin": user.profile.role == 'admin',
#                 "role": user.profile.role,
#                 "user_id": user.id
#             },
#             status=status.HTTP_200_OK
#         )
# users/views.py
# users/views.py
# users/views.py
# users/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth import get_user_model
import json
import re

# Get your custom User model
User = get_user_model()

# Google Login View
@csrf_exempt
@require_http_methods(["POST"])
def google_login(request):
    """Handle Google OAuth login"""
    try:
        data = json.loads(request.body)
        print("Google login data:", data)
        
        email = data.get('email')
        name = data.get('name')
        google_id = data.get('sub')
        
        if not email:
            return JsonResponse({'error': 'Email is required'}, status=400)
        
        # Check if user exists, if not create one - using custom User model
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],  # Use part before @ as username
                'first_name': name or ''
            }
        )
        
        if created:
            print(f"New user created via Google: {email}")
            # Profile will be created automatically by signal
        
        # Log the user in
        auth_login(request, user)
        
        # Get role from UserProfile if it exists
        role = 'viewer'
        try:
            if hasattr(user, 'profile'):
                role = user.profile.role
        except:
            pass
        
        return JsonResponse({
            'message': 'Google login successful',
            'username': user.username,
            'email': user.email,
            'user_id': user.id,
            'is_admin': user.is_superuser,
            'role': 'admin' if user.is_superuser else role,
            'is_new_user': created
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        print(f"Google login error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


# Register View - UPDATED with proper profile handling
@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    """Register a new user"""
    try:
        data = json.loads(request.body)
        print("Registration data:", data)
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        password2 = data.get('password2')
        role = data.get('role', 'viewer')
        
        # Validation
        errors = {}
        
        if not username:
            errors['username'] = 'Username is required'
        elif len(username) < 3:
            errors['username'] = 'Username must be at least 3 characters long'
        elif User.objects.filter(username=username).exists():
            errors['username'] = 'Username already exists'
        
        if not email:
            errors['email'] = 'Email is required'
        elif not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            errors['email'] = 'Please enter a valid email address'
        elif User.objects.filter(email=email).exists():
            errors['email'] = 'Email already exists'
        
        if not password:
            errors['password'] = 'Password is required'
        elif len(password) < 8:
            errors['password'] = 'Password must be at least 8 characters long'
        
        if password != password2:
            errors['password2'] = 'Passwords do not match'
        
        if errors:
            return JsonResponse({'errors': errors}, status=400)
        
        # Create user using custom User model
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        # Create or update profile using get_or_create to avoid duplicates
        from users.models import UserProfile
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={'role': role}
        )
        
        # If profile already existed but role is different, update it
        if not created and profile.role != role:
            profile.role = role
            profile.save()
        
        return JsonResponse({
            'message': 'Registration successful',
            'user': {
                'username': user.username,
                'email': user.email,
                'user_id': user.id,
                'role': profile.role
            }
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


# Login View
@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    """Handle user login"""
    try:
        data = json.loads(request.body)
        print("Login data:", data)
        
        username = data.get('username')
        password = data.get('password')
        
        errors = {}
        
        if not username:
            errors['username'] = 'Username is required'
        
        if not password:
            errors['password'] = 'Password is required'
        
        if errors:
            return JsonResponse({'errors': errors}, status=400)
        
        # Authenticate user - works with custom User model
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            auth_login(request, user)
            
            # Get role from UserProfile
            role = 'viewer'
            try:
                if hasattr(user, 'profile'):
                    role = user.profile.role
            except:
                pass
            
            return JsonResponse({
                'message': 'Login successful',
                'user': {
                    'username': user.username,
                    'email': user.email,
                    'user_id': user.id,
                    'is_admin': user.is_superuser,
                    'role': 'admin' if user.is_superuser else role
                }
            }, status=200)
        else:
            return JsonResponse({
                'error': 'Invalid username or password'
            }, status=400)
            
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        print(f"Login error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


# Check if user exists
@csrf_exempt
@require_http_methods(["POST"])
def check_user_exists(request):
    """Check if a user exists by email or username"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        username = data.get('username')
        
        response = {
            'email_exists': False,
            'username_exists': False
        }
        
        if email:
            response['email_exists'] = User.objects.filter(email=email).exists()
        
        if username:
            response['username_exists'] = User.objects.filter(username=username).exists()
        
        return JsonResponse(response, status=200)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# Test endpoint
@csrf_exempt
def test(request):
    """Test endpoint to verify API is working"""
    return JsonResponse({
        'message': 'API is working',
        'method': request.method,
        'status': 'success'
    })