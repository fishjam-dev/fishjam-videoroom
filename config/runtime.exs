import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the BE_PHX_SERVER=true when you start it:
#
#     BE_PHX_SERVER=true bin/videoroom start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.
if System.get_env("BE_PHX_SERVER") do
  config :videoroom, VideoroomWeb.Endpoint, server: true
end

if config_env() == :test do
  # FIXME it seems that divo tries to do docker cleanup
  # before RoomService exits, which results in a bunch of error
  # logs at the end of tests - RoomService is linked to the
  # Notifier and Notifier to the WS connection to the JF
  Divo.Suite.start(services: [:jellyfish], auto_start: false)
end

if config_env() == :prod do
  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("BE_SECRET_KEY_BASE") || Base.encode64(:crypto.strong_rand_bytes(48))

  host = System.get_env("BE_HOST") || "example.com"
  port = String.to_integer(System.get_env("BE_PORT") || "5004")

  config :videoroom, VideoroomWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      # See the documentation on https://hexdocs.pm/plug_cowboy/Plug.Cowboy.html
      # for details about using IPv6 vs IPv4 and loopback vs public addresses.
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: port
    ],
    secret_key_base: secret_key_base

  jellyfish_addresses =
    System.get_env("BE_JF_ADDRESSES") || raise "Environment variable BE_JF_ADDRESSES is missing."

  jellyfish_addresses = String.split(jellyfish_addresses, " ")

  secure_connection? = System.get_env("BE_JF_SECURE_CONNECTION", "false") == "true"

  config :jellyfish_server_sdk,
    secure?: secure_connection?,
    server_api_token:
      System.get_env("BE_JF_SERVER_API_TOKEN") ||
        raise("""
        Environment variable BE_JF_SERVER_API_TOKEN is missing.
        """)

  config :videoroom,
    peer_join_timeout: String.to_integer(System.get_env("BE_PEER_JOIN_TIMEOUT") || "60000"),
    jellyfish_addresses: jellyfish_addresses

  # ## SSL Support
  #
  # To get SSL working, you will need to add the `https` key
  # to your endpoint configuration:
  #
  #     config :videoroom, VideoroomWeb.Endpoint,
  #       https: [
  #         ...,
  #         port: 443,
  #         cipher_suite: :strong,
  #         keyfile: System.get_env("SOME_APP_SSL_KEY_PATH"),
  #         certfile: System.get_env("SOME_APP_SSL_CERT_PATH")
  #       ]
  #
  # The `cipher_suite` is set to `:strong` to support only the
  # latest and more secure SSL ciphers. This means old browsers
  # and clients may not be supported. You can set it to
  # `:compatible` for wider support.
  #
  # `:keyfile` and `:certfile` expect an absolute path to the key
  # and cert in disk or a relative path inside priv, for example
  # "priv/ssl/server.key". For all supported SSL configuration
  # options, see https://hexdocs.pm/plug/Plug.SSL.html#configure/1
  #
  # We also recommend setting `force_ssl` in your endpoint, ensuring
  # no data is ever sent via http, always redirecting to https:
  #
  #     config :videoroom, VideoroomWeb.Endpoint,
  #       force_ssl: [hsts: true]
  #
  # Check `Plug.SSL` for all available options in `force_ssl`.
end
