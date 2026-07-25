# Multi-stage Dockerfile for Node.js + Express + Vite application
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source files
COPY . .

# Build application (Vite frontend + bundled esbuild server.cjs)
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3300

# Install production dependencies only
COPY package.json ./
RUN npm install --only=production

# Copy compiled assets and backend from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3300

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3300/ || exit 1

# Start production server
CMD ["node", "dist/server.cjs"]
