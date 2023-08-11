defmodule Videoroom.ApiSpec.Error do
  @moduledoc false

  require OpenApiSpex

  OpenApiSpex.schema(%{
    title: "Error",
    description: "Error message",
    type: :string,
    example: "Failed to add peer"
  })
end
