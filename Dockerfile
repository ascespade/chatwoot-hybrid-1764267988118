FROM chatwoot/chatwoot:latest

WORKDIR /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api || exit 1

CMD bundle exec rails s -b 0.0.0.0 -p $PORT
