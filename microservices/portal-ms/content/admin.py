from django.contrib import admin
from .models import Banner, VideoGaleria

@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'orden', 'activo', 'created_at')
    list_editable = ('orden', 'activo') # Permite editar orden/estado rápido desde la lista
    search_fields = ('titulo', 'descripcion')
    list_filter = ('activo',)

@admin.register(VideoGaleria)
class VideoGaleriaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'activo')
    list_filter = ('activo',)
    search_fields = ('titulo',)