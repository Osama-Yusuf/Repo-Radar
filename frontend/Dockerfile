# Step 1: Build the React application
FROM node:alpine3.21

# Create user and group
# Install shadow package for groupadd and useradd
USER root
RUN apk add --no-cache shadow
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1000680000 appuser

RUN mkdir -p /workspace
# Set permissions
RUN chmod -R u+rwx,g+rw,o+r /workspace
RUN chown -R appuser:appgroup /workspace

WORKDIR /workspace
COPY package.json ./
RUN yarn install 

COPY . ./

USER appuser

EXPOSE 3000

CMD ["yarn", "start"]
