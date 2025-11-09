# Multi-stage build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code (excluding node_modules and build)
COPY public/ ./public/
COPY src/ ./src/
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Set default environment variables for build
ENV REACT_APP_API_URL=http://localhost:8003/api/v1
ENV CI=false

# Build the app (CI=false to treat warnings as non-fatal)
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]