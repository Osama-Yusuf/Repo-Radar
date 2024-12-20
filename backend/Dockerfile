FROM node:20.18.0

# Create user and group
USER root
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1000680000 appuser

RUN mkdir -p /workspace
# Set permissions
RUN chmod -R u+rwx,g+rw,o+r /workspace
RUN chown -R appuser:appgroup /workspace

WORKDIR /workspace
COPY . .
RUN yarn install --production

USER appuser

EXPOSE 3001
CMD ["node", "server.js"]
