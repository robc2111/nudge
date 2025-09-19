# ops/backup.Dockerfile
FROM debian:bookworm-slim

# Make PG major explicit so we can bump later if needed
ARG PG_MAJOR=17

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      "postgresql-client-${PG_MAJOR}" \
      awscli \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server/scripts/backup.sh /app/backup.sh
RUN chmod +x /app/backup.sh

# Helpful: print versions during container start so logs prove what we run
ENV PGCLIENTENCODING=UTF8
CMD bash -lc 'pg_dump --version && psql --version && /app/backup.sh'