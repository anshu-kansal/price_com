from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status , generics
from .serializers import RegisterSerializer, ProductSerializer
from .models import Product
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated , AllowAny
from django.shortcuts import render


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer # tell us which kind of data we enter
    permission_classes = [AllowAny] 
    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {"id": user.id, "username": user.username, "email": user.email},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
from django.contrib.auth import authenticate

class LoginView(APIView):
    def post(self, request):
        data = request.data
        username = data.get('username')
        password = data.get('password')
        
        # Use Django's authenticate to verify credentials
        user = authenticate(username=username, password=password)
        
        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            })
        return Response({"message": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

def login_page(request):
    return render(request, 'product_comparison/login.html')

def signup_page(request):
    return render(request, 'product_comparison/signup.html')

def dashboard_page(request):
    return render(request, 'product_comparison/dashboard.html')

class DashboardDataView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({
            "product_count": request.user.products.count() if hasattr(request.user, 'products') else 0,
            "alert_count": 0,
            "message": "Connected to Backend API Successfully!",
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email
            }
        })

class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Return only products belonging to the current user
        return Product.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Automatically set the user to the current user
        serializer.save(user=self.request.user)