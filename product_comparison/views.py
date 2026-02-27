from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.shortcuts import render
from django.conf import settings

import logging

from .serializers import RegisterSerializer, ProductSerializer
from .models import Product
from .agent import run_comparison_agent

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# AUTH VIEWS  (unchanged from your original)
# ─────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
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


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                "refresh": str(refresh),
                "access":  str(refresh.access_token),
                "user": {
                    "id":       user.id,
                    "username": user.username,
                    "email":    user.email,
                }
            })
        return Response(
            {"message": "Invalid credentials"},
            status=status.HTTP_400_BAD_REQUEST
        )


# ─────────────────────────────────────────────────────────────
# TEMPLATE VIEWS
# ─────────────────────────────────────────────────────────────

def login_page(request):
    return render(request, "product_comparison/login.html")

def signup_page(request):
    return render(request, "product_comparison/signup.html")

def dashboard_page(request):
    return render(request, "product_comparison/dashboard.html")

def comparator_page(request):
    """Renders the Bubble product comparison UI."""
    return render(request, "bubble/index.html")


# ─────────────────────────────────────────────────────────────
# DASHBOARD  (unchanged)
# ─────────────────────────────────────────────────────────────

class DashboardDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "product_count": request.user.products.count() if hasattr(request.user, "products") else 0,
            "alert_count":   0,
            "message":       "Connected to Backend API Successfully!",
            "user": {
                "id":       request.user.id,
                "username": request.user.username,
                "email":    request.user.email,
            }
        })


# ─────────────────────────────────────────────────────────────
# PRODUCT CRUD  (unchanged)
# ─────────────────────────────────────────────────────────────

class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class   = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ─────────────────────────────────────────────────────────────
# PRODUCT COMPARISON AGENT — TEXT / URL INPUT
# POST /api/compare/
# Body: { "query": "<product URL or name>" }
# ─────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class CompareAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [JSONParser]

    def get(self, request):
        return Response({
            "message": 'Send a POST request with JSON body: {"query": "<product URL or name>"}'
        })

    def post(self, request):
        query = (request.data.get("query") or "").strip()

        if not query:
            return Response(
                {"error": "Field 'query' is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            output = run_comparison_agent(
                user_input=query,
                tavily_api_key=settings.TAVILY_API_KEY,
                target_marketplaces=settings.TARGET_MARKETPLACES,
                openrouter_api_key=settings.OPENROUTER_API_KEY,
                min_match_score=settings.MIN_MATCH_SCORE,
            )
        except Exception as exc:
            logger.exception("CompareAPIView pipeline error")
            return Response(
                {
                    "product_identity": {"brand": "", "product": "", "variant": ""},
                    "comparisons":      [],
                    "confidence":       0.0,
                    "error":            str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(output, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────
# PRODUCT COMPARISON AGENT — IMAGE INPUT  (Qwen VL via OpenRouter)
# POST /api/compare/image/
# Multipart form: image=<file>  [hint=<optional text>]
# ─────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class CompareImageAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        image_file = request.FILES.get("image")
        hint       = (request.data.get("hint") or "").strip()

        if not image_file and not hint:
            return Response(
                {"error": "Provide either an image file or a hint text field."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type before reading
        if image_file:
            allowed_types = ("image/jpeg", "image/png", "image/webp")
            if image_file.content_type not in allowed_types:
                return Response(
                    {
                        "error": (
                            f"Unsupported image type '{image_file.content_type}'. "
                            "Please upload a JPEG, PNG, or WEBP file."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        image_data = image_file.read() if image_file else None
        user_input = hint or (image_file.name if image_file else "")

        try:
            output = run_comparison_agent(
                user_input=user_input,
                tavily_api_key=settings.TAVILY_API_KEY,
                target_marketplaces=settings.TARGET_MARKETPLACES,
                openrouter_api_key=settings.OPENROUTER_API_KEY,
                min_match_score=settings.MIN_MATCH_SCORE,
                image_data=image_data,
            )
        except Exception as exc:
            logger.exception("CompareImageAPIView pipeline error")
            return Response(
                {
                    "product_identity": {"brand": "", "product": "", "variant": ""},
                    "comparisons":      [],
                    "confidence":       0.0,
                    "error":            str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(output, status=status.HTTP_200_OK)