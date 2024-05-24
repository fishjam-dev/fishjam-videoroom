defmodule VideoroomWeb.ApiSpec.Token do
  @moduledoc false

  require OpenApiSpex

  OpenApiSpex.schema(%{
    title: "PeerToken",
    description: "Peer token used for authorizing websocket connection to the Fishjam Server",
    type: :string,
    example: "SFMyNTY.g2gDdAAhiOL4CdsaboT9-jtMzhoI"
  })
end
