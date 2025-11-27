FROM chatwoot/chatwoot:latest

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start command will be set via Railway environment variables
# Default: Rails server
CMD ["bundle", "exec", "rails", "s", "-b", "0.0.0.0", "-p", "3000"]

