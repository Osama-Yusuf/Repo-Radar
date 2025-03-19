#!/bin/bash
# save as start.sh in your project

ARCH=$(uname -m)
if [ "$ARCH" = "ppc64" ] || [ "$ARCH" = "ppc64le" ]; then
  echo "Detected ppc64le architecture - skipping Prisma migrations"
  # Just start the app without migrations
  pnpm start
else
  # For supported architectures, run migrations normally
  pnpm exec prisma migrate deploy && pnpm start
fi
