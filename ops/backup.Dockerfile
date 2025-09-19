# ops/backup.Dockerfile
# Small, reproducible image with pg_dump + awscli
FROM alpine:3.20

# Install PostgreSQL client (for pg_dump) and AWS CLI deps
RUN apk add --no-cache postgresql16-client curl unzip bash ca-certificates && \
    update-ca-certificates

# Install AWS CLI v2 (static)
RUN curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip \
 && unzip -q /tmp/awscliv2.zip -d /tmp \
 && /tmp/aws/install -i /opt/aws-cli -b /usr/local/bin \
 && rm -rf /tmp/aws /tmp/awscliv2.zip

# Copy your script into the image
WORKDIR /app
COPY server/scripts/backup.sh /app/backup.sh
RUN chmod +x /app/backup.sh

# Default command (Render Cron Job will override if you want)
CMD ["/app/backup.sh"]