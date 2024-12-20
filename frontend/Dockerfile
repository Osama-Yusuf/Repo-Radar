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
COPY --from=build /workspace/dist /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf

USER appuser

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

