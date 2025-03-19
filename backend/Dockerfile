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

# Install dependencies
RUN pnpm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/

# Architecture-specific Prisma handling
RUN if [ "$(uname -m)" = "ppc64" ] || [ "$(uname -m)" = "ppc64le" ]; then \
      echo "Detected ppc64le architecture - using special Prisma handling"; \
      # Create empty prisma client directory to prevent errors
      mkdir -p node_modules/.prisma/client; \
      # Create a simple mock of the Prisma client
      echo "console.warn('Using mock Prisma client for ppc64le architecture');\n\
      module.exports = { PrismaClient: class PrismaClient { constructor() { } } };" > node_modules/.prisma/client/index.js; \
    else \
      # For supported architectures, generate normally
      pnpm exec prisma generate; \
    fi  

# Copy the rest of the application
COPY . .

# Ensure correct permissions
RUN chown -R appuser:appgroup .

USER appuser

EXPOSE 3001

COPY start.sh .
RUN chmod +x start.sh

# Change CMD to use the script
CMD ["./start.sh"]
