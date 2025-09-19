# ops/backup.Dockerfile
FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      postgresql-client-17 \
      awscli \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server/scripts/backup.sh /app/backup.sh
RUN chmod +x /app/backup.sh

CMD ["/app/backup.sh"]