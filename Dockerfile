# Ladybug Hosting v7 - Docker Configuration
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]

# Labels
LABEL maintainer="Ladybug Hosting Team" \
      version="7.0.0" \
      description="Ladybug Hosting v7 - Advanced Bot Net Server Platform" \
      org.opencontainers.image.title="Ladybug Hosting v7" \
      org.opencontainers.image.version="7.0.0" \
      org.opencontainers.image.vendor="Ladybug Hosting"