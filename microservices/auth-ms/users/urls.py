from django.urls import path
from .views import RegisterView, CustomTokenObtainPairView, UserDetailView, DynamicMenuView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserDetailView.as_view(), name='auth_user_detail'),
    path('menu/', DynamicMenuView.as_view(), name='dynamic_menu'),
]