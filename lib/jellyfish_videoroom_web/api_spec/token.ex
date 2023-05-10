defmodule JellyfishVideoroomWeb.ApiSpec.Token do
  @moduledoc false

  require OpenApiSpex

  OpenApiSpex.schema(%{
    title: "PeerToken",
    description: "Peer token used for authorizing websocket connection to the Jellyfish Server",
    type: :string,
    example: "SFMyNTY.g2gDdAAhiOL4CdsaboT9-jtMzhoI"
  })
end
