defmodule Fishjam.PeerMessage.Authenticated do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.12.0", syntax: :proto3
end

defmodule Fishjam.PeerMessage.AuthRequest do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.12.0", syntax: :proto3

  field :token, 1, type: :string
end

defmodule Fishjam.PeerMessage.MediaEvent do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.12.0", syntax: :proto3

  field :data, 1, type: :string
end

defmodule Fishjam.PeerMessage do
  @moduledoc false

  use Protobuf, protoc_gen_elixir_version: "0.12.0", syntax: :proto3

  oneof :content, 0

  field :authenticated, 1, type: Fishjam.PeerMessage.Authenticated, oneof: 0

  field :auth_request, 2,
    type: Fishjam.PeerMessage.AuthRequest,
    json_name: "authRequest",
    oneof: 0

  field :media_event, 3, type: Fishjam.PeerMessage.MediaEvent, json_name: "mediaEvent", oneof: 0
end
