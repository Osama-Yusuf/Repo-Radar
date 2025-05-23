#!/bin/bash

# build_and_push_frontend.sh

# Function to display usage
usage() {
    echo "Usage: $0 <version>"
    echo "Build and push the frontend Docker image with the specified version."
    echo ""
    echo "Arguments:"
    echo "  version    The version tag for the Docker image"
    exit 1
}

# Check if version argument is provided
if [ $# -eq 0 ]; then
    echo "Error: Version argument is missing."
    usage
fi

# Validate version format (simple check for non-empty string)
if [ -z "$1" ]; then
    echo "Error: Invalid version format."
    usage
fi

version=$1

echo "Building and pushing frontend image version: $version"

docker rmi -f osamayusuf/repo-radar_frontend:$version
docker build -t osamayusuf/repo-radar_frontend:$version . && docker push osamayusuf/repo-radar_frontend:$version
