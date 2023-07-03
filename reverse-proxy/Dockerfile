FROM nginx:1.25-alpine

ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx

COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

COPY nginx.dev.conf.template /etc/nginx/templates/nginx.dev.conf.template 

ENV NGINX_ENV=dev

# Copy the script from your host system into the Docker image.
COPY entrypoint.sh /entrypoint.sh

# Make the script executable.
RUN chmod +x /entrypoint.sh

# Use the script as the entrypoint of the Docker image.
ENTRYPOINT ["/entrypoint.sh"]