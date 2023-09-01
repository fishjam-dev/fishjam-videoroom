import Config

config :jellyfish_server_sdk,
  server_address: "jellyfish:5002",
  server_api_token: "development"

config :videoroom,
  peer_join_timeout: 500,
  jellyfish_addresses: ["jellyfish:5002"]
