# Use official Chatwoot Docker image
FROM chatwoot/chatwoot:latest

# Set working directory
WORKDIR /app

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/api || exit 1

# Start Rails server
# Railway sets PORT automatically, use it
CMD bundle exec rails s -b 0.0.0.0 -p ${PORT:-3000}
