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
      # Create mock directories
      mkdir -p node_modules/.prisma/client; \
      mkdir -p node_modules/@prisma/client; \
      mkdir -p node_modules/.prisma/client/default; \
      # Create a mockPrismaClient.js file with all your models
      echo "console.warn('Using mock Prisma client for ppc64le architecture');\n\
      class PrismaClient {\n\
        constructor() {\n\
          console.warn('Mock PrismaClient initialized');\n\
          this._middlewares = [];\n\
          this._connected = false;\n\
          \n\
          // Project model mock\n\
          this.project = {\n\
            findMany: async () => [],\n\
            findUnique: async () => null,\n\
            findFirst: async () => null,\n\
            create: async (data) => data.data,\n\
            update: async (data) => data.data,\n\
            delete: async () => ({}),\n\
            count: async () => 0\n\
          };\n\
          \n\
          // Branch model mock\n\
          this.branch = {\n\
            findMany: async () => [],\n\
            findUnique: async () => null,\n\
            findFirst: async () => null,\n\
            create: async (data) => data.data,\n\
            update: async (data) => data.data,\n\
            delete: async () => ({}),\n\
            upsert: async (data) => data.create,\n\
            count: async () => 0\n\
          };\n\
          \n\
          // CheckLog model mock\n\
          this.checkLog = {\n\
            findMany: async () => [],\n\
            findUnique: async () => null,\n\
            findFirst: async () => null,\n\
            create: async (data) => data.data,\n\
            update: async (data) => data.data,\n\
            delete: async () => ({}),\n\
            count: async () => 0\n\
          };\n\
          \n\
          // Action model mock\n\
          this.action = {\n\
            findMany: async () => [],\n\
            findUnique: async () => null,\n\
            findFirst: async () => null,\n\
            create: async (data) => data.data,\n\
            update: async (data) => data.data,\n\
            delete: async () => ({}),\n\
            count: async () => 0\n\
          };\n\
          \n\
          // Secret model mock\n\
          this.secret = {\n\
            findMany: async () => [],\n\
            findUnique: async () => null,\n\
            findFirst: async () => null,\n\
            create: async (data) => data.data,\n\
            update: async (data) => data.data,\n\
            delete: async () => ({}),\n\
            count: async () => 0\n\
          };\n\
          \n\
          // WebhookParameter model mock\n\
          this.webhookParameter = {\n\
            findMany: async () => [],\n\
            findUnique: async () => null,\n\
            findFirst: async () => null,\n\
            create: async (data) => data.data,\n\
            update: async (data) => data.data,\n\
            delete: async () => ({}),\n\
            upsert: async (data) => data.create,\n\
            count: async () => 0\n\
          };\n\
          \n\
          // Transaction mock\n\
          this.\$transaction = async (operations) => {\n\
            if (Array.isArray(operations)) {\n\
              return Promise.all(operations.map(op => Promise.resolve({})));\n\
            } else if (typeof operations === 'function') {\n\
              return operations(this);\n\
            }\n\
            return [];\n\
          };\n\
        }\n\
        \n\
        // Add $use method for middleware support\n\
        \$use(middleware) {\n\
          console.log('Added mock middleware');\n\
          this._middlewares.push(middleware);\n\
          return this;\n\
        }\n\
        \n\
        // Add $connect method\n\
        \$connect() {\n\
          console.log('Mock connected to database');\n\
          this._connected = true;\n\
          return Promise.resolve();\n\
        }\n\
        \n\
        // Add $disconnect method\n\
        \$disconnect() {\n\
          console.log('Mock disconnected from database');\n\
          this._connected = false;\n\
          return Promise.resolve();\n\
        }\n\
      }\n\
      \n\
      module.exports = { PrismaClient };" > node_modules/.prisma/client/index.js; \
      # Create a mock for default.js
      echo "Object.defineProperty(exports, \"__esModule\", { value: true });\n\
      exports.Prisma = exports.PrismaClient = void 0;\n\
      var client_1 = require(\".prisma/client\");\n\
      Object.defineProperty(exports, \"PrismaClient\", { enumerable: true, get: function () { return client_1.PrismaClient; } });\n\
      var runtime = { \n\
        DbNull: Symbol('DbNull'),\n\
        JsonNull: Symbol('JsonNull'),\n\
        AnyNull: Symbol('AnyNull')\n\
      };\n\
      exports.Prisma = { ...runtime };" > node_modules/@prisma/client/default.js; \
      # Create a mock for .prisma/client/default
      echo "Object.defineProperty(exports, \"__esModule\", { value: true });\n\
      exports.Prisma = exports.PrismaClient = void 0;\n\
      var mockPrisma = require(\"../index.js\");\n\
      Object.defineProperty(exports, \"PrismaClient\", { enumerable: true, get: function () { return mockPrisma.PrismaClient; } });\n\
      var runtime = { \n\
        DbNull: Symbol('DbNull'),\n\
        JsonNull: Symbol('JsonNull'),\n\
        AnyNull: Symbol('AnyNull')\n\
      };\n\
      exports.Prisma = { ...runtime };" > node_modules/.prisma/client/default/index.js; \
      # Create a mock for the schema.prisma for prisma migrate
      mkdir -p node_modules/.bin; \
      echo '#!/bin/sh\necho "Mock migration completed (skipped on ppc64le)"' > node_modules/.bin/prisma; \
      chmod +x node_modules/.bin/prisma; \
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

CMD if [ "$(uname -m)" = "ppc64" ] || [ "$(uname -m)" = "ppc64le" ]; then \
      echo "Detected ppc64le architecture - skipping Prisma migrations"; \
      # Just start the app without migrations
      pnpm start; \
    else \
      # For supported architectures, run migrations normally
      pnpm exec prisma migrate deploy && pnpm start; \
    fi

