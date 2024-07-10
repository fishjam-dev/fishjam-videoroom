# ==== CONFIGURE =====
FROM node:20-alpine3.20 as builder
RUN corepack enable

WORKDIR '/app'

ARG FE_BE_HOST
ARG ALLOY_API_KEY
ARG FISHJAM_ROOM_VERSION
ARG FISHJAM_VERSION
ENV VITE_BE_HOST=$FE_BE_HOST
ENV VITE_FISHJAM_ROOM_VERSION=$FISHJAM_ROOM_VERSION
ENV VITE_FISHJAM_VERSION=$FISHJAM_VERSION
ENV VITE_ALLOY_API_KEY=$ALLOY_API_KEY

# Install nodejs and npm
RUN apk add --no-cache git

# Own the app directory
RUN chown node:node ./

# It's adviced to run the container as non-root user
# for added security if the base image has the user
USER node

COPY package*.json ./
COPY .yarnrc.yml ./
COPY yarn.lock ./

# ==== BUILD =====
# Install dependencies
RUN yarn --immutable

# Copy application files
COPY . .

# Build the app
RUN yarn build

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
