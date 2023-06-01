defmodule Videorom.ApiSpec.Error do
  @moduledoc false

  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "Error",
    description: "Error message",
    type: :string,
    example: "Failed to add peer"
  })
end
