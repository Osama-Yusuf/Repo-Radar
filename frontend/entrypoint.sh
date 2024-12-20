#!/bin/sh

# Replace placeholders with environment variable values in HTML and JS files
for VAR in $(env | grep -o '^[^=]*'); do
  VALUE=$(printenv $VAR)
  find /usr/share/nginx/html/ -type f \( -name "*.html" -o -name "*.js" \) -exec sed -i "s|\$$VAR|$VALUE|g" {} \;
done

# Start NGINX
exec "$@"
