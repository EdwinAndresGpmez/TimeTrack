#!/bin/sh

# Detener el script si hay errores
set -e

echo "🚀 [Auth-MS] Iniciando script de arranque..."

# 1. Crear migraciones si hubo cambios en los modelos (Desarrollo)
echo "📦 Revisando cambios en modelos (makemigrations)..."
python manage.py makemigrations --noinput

# 2. Aplicar migraciones pendientes (Solo actúa si faltan)
echo "🔄 Aplicando migraciones a la base de datos (migrate)..."
python manage.py migrate --noinput

# 3. Sincronizar Rutas desde React (TU COMANDO NUEVO)
# Esto requiere que el volumen de App.jsx esté configurado en docker-compose
if [ -f "/app/source_feed/App.jsx" ]; then
    echo "🔗 Sincronizando rutas y permisos desde Frontend..."
    python manage.py sync_routes
else
    echo "⚠️ Advertencia: No se encontró App.jsx montado. Saltando sync_routes."
fi

# 4. Iniciar el servidor
echo "✅ Iniciando Servidor Django..."
exec "$@"