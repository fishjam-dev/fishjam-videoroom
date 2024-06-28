import Config

if System.get_env("BE_PHX_SERVER") do
  config :videoroom, VideoroomWeb.Endpoint, server: true
end

if config_env() == :test do
  # FIXME it seems that divo tries to do docker cleanup
  # before RoomService exits, which results in a bunch of error
  # logs at the end of tests - RoomService is linked to the
  # Notifier and Notifier to the WS connection to the JF
  Divo.Suite.start(services: [:fishjam], auto_start: false)
end

if config_env() == :prod do
  secret_key_base =
    System.get_env("BE_SECRET_KEY_BASE") || Base.encode64(:crypto.strong_rand_bytes(48))

  host = System.get_env("BE_HOST") || "example.com"
  port = String.to_integer(System.get_env("BE_PORT") || "5004")

  config :videoroom, VideoroomWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: port
    ],
    secret_key_base: secret_key_base

  secure_connection? = System.get_env("BE_JF_SECURE_CONNECTION", "false") == "true"

  config :fishjam_server_sdk,
    secure?: secure_connection?,
    server_api_token:
      System.get_env("BE_JF_SERVER_API_TOKEN") ||
        raise("""
        Environment variable BE_JF_SERVER_API_TOKEN is missing.
        """)

  config :videoroom,
    fishjam_address: (System.get_env("BE_JF_ADDRESS") || raise "Environment variable BE_JF_ADDRESS is missing."),
    peer_disconnected_timeout:
      String.to_integer(System.get_env("PEER_DISCONNECTED_TIMEOUT") || "120"),
    peerless_purge_timeout: String.to_integer(System.get_env("PEERLESS_PURGE_TIMEOUT") || "60")
end
