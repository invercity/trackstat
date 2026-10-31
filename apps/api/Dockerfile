# syntax=docker/dockerfile:1

# 1. Builder Stage
FROM node:24-alpine AS builder
WORKDIR /app

# Copy lockfiles and package manifests
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies (including devDependencies needed for nest build)
RUN npm ci

# Copy API source and build
COPY apps/api ./apps/api
RUN npm run build -w api

# 2. Production Runner Stage (Minimal footprint)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

USER node
EXPOSE 8080

CMD ["node", "apps/api/dist/main.js"]
