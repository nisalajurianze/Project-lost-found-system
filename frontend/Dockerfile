# syntax=docker/dockerfile:1.7
FROM node:22.14-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force
COPY . .
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ENV VITE_API_URL=${VITE_API_URL} VITE_SOCKET_URL=${VITE_SOCKET_URL}
RUN npm run lint && npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/health || exit 1
