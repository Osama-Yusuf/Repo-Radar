# Step 1: Build the React application
FROM node:20.18.0 AS build

# Create user and group
USER root
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1000680000 appuser

RUN mkdir -p /workspace
# Set permissions
RUN chmod -R u+rwx,g+rw,o+r /workspace
RUN chown -R appuser:appgroup /workspace

WORKDIR /workspace
COPY package.json ./
RUN yarn install 

COPY . ./
RUN yarn build

# Step 2: Serve the application using a server like nginx
FROM nginx:stable-alpine

USER root

# Install necessary tools to create users/groups
RUN apk add --no-cache shadow

# Recreate the user and group
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1000680000 appuser

# Set permissions
RUN chmod -R u+rwx,g+rw,o+r /usr/share/nginx
RUN chmod -R u+rwx,g+rw,o+r /etc/nginx
RUN chmod -R u+rwx,g+rw,o+r /var/cache/nginx
RUN chown -R appuser:appgroup /usr/share/nginx
RUN chown -R appuser:appgroup /etc/nginx
RUN chown -R appuser:appgroup /var/cache/nginx

RUN mkdir -p /var/run/nginx && \
    chmod -R u+rwx,g+rw,o+r /var/run/nginx && \
    chown -R appuser:appgroup /var/run/nginx

RUN mkdir -p /tmp && \
    chmod -R u+rwx,g+rw,o+r /tmp && \
    chown -R appuser:appgroup /tmp

RUN chmod -R u+w /usr/share/nginx/html

# Remove the `user` directive from NGINX configuration to avoid warnings
RUN sed -i '/^user/d' /etc/nginx/nginx.conf

# Copy React build output to NGINX
COPY --from=build /workspace/dist /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Add entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER appuser

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
