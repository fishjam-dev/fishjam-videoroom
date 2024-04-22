import Config

config :jellyfish_server_sdk,
  server_address: "jellyfish:5002",
  server_api_token: "development"

config :videoroom,
  jellyfish_addresses: ["jellyfish:5002"],
  peer_disconnected_timeout: 1,
  peerless_purge_timeout: 3
