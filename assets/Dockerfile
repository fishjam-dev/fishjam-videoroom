# ==== CONFIGURE =====
# Use alpine as base image, node alpine image is causing issues with build on mac
FROM alpine:3.18 as builder
WORKDIR '/app'

ARG FE_BE_HOST
ARG JELLYROOM_VERSION
ARG JELLYFISH_VERSION
ENV VITE_BE_HOST=$FE_BE_HOST
ENV VITE_JELLYROOM_VERSION=$JELLYROOM_VERSION
ENV VITE_JELLYFISH_VERSION=$JELLYFISH_VERSION

# Install nodejs and npm
RUN apk add --no-cache nodejs npm

# Create a non-root user
RUN adduser --disabled-password --gecos "" node

# Own the app directory
RUN chown node:node ./

# It's adviced to run the container as non-root user 
# for added security if the base image has the user
USER node

COPY package*.json ./

# ==== BUILD =====
# Install dependencies
RUN npm ci

# Copy application files 
COPY . .

# Build the app
RUN npm run build

# ==== SERVE =====

# Bundle static assets with nginx
FROM nginx:1.25-alpine as production

ENV NODE_ENV=production

# Copy built assets from `builder` image
COPY --from=builder /app/dist /usr/share/nginx/html

# Add your nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 5005

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
