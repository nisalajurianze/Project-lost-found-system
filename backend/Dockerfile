# syntax=docker/dockerfile:1.7
FROM node:22.14-alpine AS dependencies
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:22.14-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=5000
RUN apk add --no-cache tini \
  && addgroup -S app -g 10001 \
  && adduser -S app -u 10001 -G app
COPY --from=dependencies --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app . .
USER app
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
