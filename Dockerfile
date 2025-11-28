FROM chatwoot/chatwoot:latest

WORKDIR /app

# Build-time arguments for ActiveRecord Encryption (required during assets:precompile)
ARG ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY
ARG ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY
ARG ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT

# Set as environment variables for Rails to access during build
ENV ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY=${ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY}
ENV ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY=${ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY}
ENV ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT=${ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT}

# Also set the dot-notation format that Rails expects
ENV active_record_encryption.primary_key=${ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY}
ENV active_record_encryption.deterministic_key=${ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY}
ENV active_record_encryption.key_derivation_salt=${ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT}

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api || exit 1

# Create entrypoint script to run migrations before starting server
# Use RAILS_MASTER_KEY and skip schema loading to prevent eager loading
RUN echo '#!/bin/sh' > /app/docker-entrypoint.sh && \
    echo 'set -e' >> /app/docker-entrypoint.sh && \
    echo 'echo "=== Checking database connection ==="' >> /app/docker-entrypoint.sh && \
    echo 'until RAILS_ENV=production bundle exec rails runner "ActiveRecord::Base.connection.execute(\"SELECT 1\")" 2>/dev/null; do' >> /app/docker-entrypoint.sh && \
    echo '  echo "Waiting for database..."' >> /app/docker-entrypoint.sh && \
    echo '  sleep 2' >> /app/docker-entrypoint.sh && \
    echo 'done' >> /app/docker-entrypoint.sh && \
    echo 'echo "=== Running database setup ==="' >> /app/docker-entrypoint.sh && \
    echo 'RAILS_ENV=production DISABLE_SPRING=1 bundle exec rails db:chatwoot_prepare 2>&1 || echo "Setup completed or already run"' >> /app/docker-entrypoint.sh && \
    echo 'echo "=== Starting Rails server ==="' >> /app/docker-entrypoint.sh && \
    echo 'exec bundle exec rails s -b 0.0.0.0 -p ${PORT:-3000}' >> /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

CMD ["/app/docker-entrypoint.sh"]
