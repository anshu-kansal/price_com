# from rest_framework import serializers
# from django.contrib.auth.models import User
# from .models import UserProfile

# class RegisterSerializer(serializers.ModelSerializer):
#     password = serializers.CharField(write_only=True, style={'input_type': 'password'})
#     password2 = serializers.CharField(write_only=True, style={'input_type': 'password'})
#     role = serializers.ChoiceField(
#         choices=UserProfile.ROLE_CHOICES,
#         write_only=True,
#         default='viewer'
#     )
#     email = serializers.EmailField(required=True)

#     class Meta:
#         model = User
#         fields = ["username", "email", "password", "password2", "role"]

#     def validate(self, data):
#         # Check if username exists
#         if User.objects.filter(username=data["username"]).exists():
#             raise serializers.ValidationError({
#                 "username": "Username already exists"
#             })
        
#         # Check if email exists
#         if User.objects.filter(email=data["email"]).exists():
#             raise serializers.ValidationError({
#                 "email": "Email already exists"
#             })

#         # Check if passwords match
#         if data["password"] != data["password2"]:
#             raise serializers.ValidationError({
#                 "password": "Passwords do not match"
#             })

#         return data

#     def create(self, validated_data):
#         role = validated_data.pop("role")
#         validated_data.pop("password2")

#         # Create user - profile will be auto-created by signal
#         user = User.objects.create_user(
#             username=validated_data["username"],
#             email=validated_data["email"],
#             password=validated_data["password"]
#         )
        
#         # Update the profile role (since signal creates it with default role)
#         user.profile.role = role
#         user.profile.save()
        
#         return user


# class GoogleAuthSerializer(serializers.Serializer):
#     email = serializers.EmailField()
#     name = serializers.CharField(required=False, allow_blank=True)
#     given_name = serializers.CharField(required=False, allow_blank=True)
#     family_name = serializers.CharField(required=False, allow_blank=True)
#     picture = serializers.URLField(required=False, allow_blank=True)
#     sub = serializers.CharField()
# users/serializers.py
# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model  # Use this to get the custom User model
from users.models import UserProfile  # Import UserProfile if needed

# Get your custom User model
User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False, default='viewer')
    
    class Meta:
        model = User  # Now this references your custom User model
        fields = ['username', 'email', 'password', 'password2', 'role']
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({
                'password': 'Passwords do not match'
            })
        
        # Check if email already exists using custom User model
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({
                'email': 'Email already exists'
            })
        
        # Check if username already exists using custom User model
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({
                'username': 'Username already exists'
            })
        
        return data
    
    def create(self, validated_data):
        validated_data.pop('password2')
        role = validated_data.pop('role', 'viewer')  # Remove role from validated data
        
        # Create user using custom User model
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # Create UserProfile with role
        UserProfile.objects.create(
            user=user,
            role=role
        )
        
        return user