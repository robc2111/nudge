# ops/backup.Dockerfile
FROM debian:bookworm-slim

ARG PG_MAJOR=17

# Add PostgreSQL APT repo
RUN apt-get update \
 && apt-get install -y wget gnupg lsb-release \
 && sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list' \
 && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      "postgresql-client-${PG_MAJOR}" \
      awscli \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY /scripts/backup.sh /app/backup.sh
RUN chmod +x /app/backup.sh

ENV PGCLIENTENCODING=UTF8

# Helpful: log versions before running backup
CMD bash -lc 'pg_dump --version && psql --version && /app/backup.sh'