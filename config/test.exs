import Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :videoroom, VideoroomWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "ZARcyCI5SXpckH0BXnmeifEvUBnxxyqIR6PZDcmHKOUH3EbUHCeep0pdjXLYYdSq",
  server: false

config :jellyfish_server_sdk,
  server_address: "localhost:5002",
  server_api_token: "development"

config :videoroom,
  divo: "docker-compose-integration.yaml",
  divo_wait: [dwell: 1500, max_tries: 50]

config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime
