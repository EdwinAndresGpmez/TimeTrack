FROM python:3.11-slim

# Evita que Python genere archivos .pyc y permite logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Instalación de dependencias del sistema para psycopg2
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Instalación de dependencias de Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

COPY entrypoint.sh /entrypoint.sh

# 2. Convertir finales de línea de Windows (CRLF) a Linux (LF)
# (Esto es VITAL si trabajas en Windows para evitar error "exec user process caused: no such file")
RUN sed -i 's/\r$//g' /entrypoint.sh

# 3. Dar permisos de ejecución
RUN chmod +x /entrypoint.sh

# 4. Definir el Entrypoint
ENTRYPOINT ["/entrypoint.sh"]