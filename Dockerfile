FROM node:14

# Instala ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia el archivo package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos del proyecto
COPY . .

EXPOSE 3000

# Comando para iniciar tu aplicación
CMD [ "node", "index.js" ]