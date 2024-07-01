import Config

config :fishjam_server_sdk,
  server_address: "fishjam:5002",
  server_api_token: "development"

config :videoroom,
  fishjam_address: "fishjam:5002",
  peer_disconnected_timeout: 1,
  peerless_purge_timeout: 3
