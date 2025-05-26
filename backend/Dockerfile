FROM node:20.18.0

# Create user and group
USER root
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1000680000 appuser

RUN mkdir -p /workspace
# Set permissions
RUN chmod -R u+rwx,g+rw,o+r /workspace
RUN chown -R appuser:appgroup /workspace

WORKDIR /workspace

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install Gitleaks
ENV GITLEAKS_VERSION=v8.26.0
ENV GITLEAKS_ARCH=x64
RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && \
    wget https://github.com/gitleaks/gitleaks/releases/download/${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_${GITLEAKS_ARCH}.tar.gz -O gitleaks.tar.gz && \
    tar -xzf gitleaks.tar.gz gitleaks && \
    chmod +x gitleaks && \
    mv gitleaks /usr/local/bin/gitleaks && \
    rm gitleaks.tar.gz && \
    apt-get purge -y --auto-remove wget ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN pnpm install

# Copy the rest of the application
COPY . .

# Ensure correct permissions
RUN chown -R appuser:appgroup .

USER appuser

EXPOSE 3001

CMD ["sh", "-c", "node src/scripts/setup-db.js && pnpm start"]