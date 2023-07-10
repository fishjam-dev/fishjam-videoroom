# STEP 1: Use an official Elixir runtime as a parent image
FROM hexpm/elixir:1.14.4-erlang-25.3.2-alpine-3.16.5 AS builder

# install git
RUN apk add --no-cache git

# Install hex and rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Initialize a new application
RUN mkdir /app
RUN mkdir /dist

COPY . /app
WORKDIR /app

# Fetch the application dependencies and compile the app
RUN mix do deps.get, deps.compile, compile

# Set the MIX environment
ENV MIX_ENV=prod

# Build a release and list the contents of the release directory
RUN mix release --overwrite --path /dist


# STEP 2: Use an official Erlang runtime as a parent image for the runtime environment
FROM hexpm/elixir:1.14.4-erlang-25.3.2-alpine-3.16.5

# Install openssl
RUN apk add --no-cache openssl ncurses-libs

# Create an environment variable with the directory where the app is going to be installed
ENV APP_HOME=/opt/app 

# Create the application directory 
RUN mkdir "$APP_HOME"

# Copy over the build artifact from step #1 and set correct permissions
COPY --from=builder /dist "$APP_HOME"
WORKDIR "$APP_HOME"

# Expose relevant ports for the application
EXPOSE 5004

# keep the release running

CMD ["./bin/videoroom", "start"]
