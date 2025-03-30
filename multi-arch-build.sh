#!/bin/bash
# Script to build a multi-architecture Docker image and push to DockerHub

# Set your DockerHub username and image name
DOCKER_USERNAME="osamayusuf"
DOCKER_PASSWORD="147896325@Osama"
IMAGE_NAME="repo-radar_frontend"
TAG="k8s-3"
# Set architectures - default includes ppc64le, but can be overridden
ARCHITECTURES=${ARCHITECTURES:-"linux/amd64,linux/arm64,linux/ppc64le"}

# Install QEMU emulators for all architectures
echo "Installing QEMU emulation support..."
docker run --privileged --rm tonistiigi/binfmt --install all

# Remove existing builder if it exists
if docker buildx inspect multiarch-builder > /dev/null 2>&1; then
    echo "Removing existing builder..."
    docker buildx rm multiarch-builder
fi

# Create a new builder with proper configuration
echo "Creating new buildx builder instance..."
docker buildx create --name multiarch-builder --driver docker-container --use --bootstrap

# Verify the supported platforms
echo "Verifying supported platforms..."
docker buildx inspect --bootstrap

echo "Setup complete! Your builder should now support multiple architectures including ppc64le."

# Login to DockerHub
echo "Logging in to DockerHub..."
echo "$DOCKER_PASSWORD" | docker login -u $DOCKER_USERNAME --password-stdin

# Build and push the multi-architecture image
echo "Building and pushing multi-architecture image..."
docker buildx build --platform $ARCHITECTURES \
  --tag $DOCKER_USERNAME/$IMAGE_NAME:$TAG \
  --push \
  .

# Verify the image manifest
echo "Verifying image manifest..."
docker buildx imagetools inspect $DOCKER_USERNAME/$IMAGE_NAME:$TAG

echo "Multi-architecture build and push completed successfully!"