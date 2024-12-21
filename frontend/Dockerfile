# Step 1: Build the React application
# FROM node:alpine3.21
FROM node:23.5.0-slim

# Create user and group
# Install shadow package for groupadd and useradd
USER root
# RUN apk add --no-cache shadow
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1000680000 appuser

RUN mkdir -p /workspace

WORKDIR /workspace
COPY package.json ./
RUN yarn install 
# Set permissions
RUN chmod -R u+rwx,g+rw,o+r /workspace
RUN chown -R appuser:appgroup /workspace

COPY . ./

USER appuser

EXPOSE 5173

CMD ["yarn", "dev"]
