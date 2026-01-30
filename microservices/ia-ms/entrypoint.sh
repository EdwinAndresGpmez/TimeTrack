#!/bin/sh

# Detener el script si hay errores
set -e

echo "🚀 [Service] Iniciando script de arranque..."

# 1. Crear migraciones si hubo cambios en los modelos
echo "📦 Revisando cambios en modelos (makemigrations)..."
python manage.py makemigrations --noinput

# 2. Aplicar migraciones pendientes
echo "🔄 Aplicando migraciones a la base de datos (migrate)..."
python manage.py migrate --noinput

# 3. Iniciar el servidor
echo "✅ Iniciando Servidor Django..."
exec "$@"