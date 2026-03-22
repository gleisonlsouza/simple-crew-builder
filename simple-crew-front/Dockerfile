# Estágio 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
# Build sem VITE_API_URL = URLs relativas (Nginx faz o proxy)
RUN npm run build 

# Estágio 2: Produção (Nginx + Reverse Proxy)
FROM nginx:alpine

# Copia a config customizada do Nginx (com reverse proxy para /api/)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos do build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
