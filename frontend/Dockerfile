# Usamos una imagen ligera de Node
FROM node:22-alpine

# Directorio de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias primero para aprovechar el caché
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto de desarrollo de Vite
EXPOSE 5173

# Comando para iniciar en modo desarrollo
CMD ["npm", "run", "dev", "--", "--host"]