#!/bin/bash

if [ "$NGINX_ENV" = "dev" ]; then
    mv /etc/nginx/templates/nginx.dev.conf.template /etc/nginx/templates/nginx.conf.template;
fi

nginx -g "daemon off;"