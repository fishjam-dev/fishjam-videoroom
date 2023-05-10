defmodule JellyfishVideoroomWeb.RoomJSON do
  @moduledoc false

  @spec show(map()) :: %{data: map()}
  def show(%{token: token}) do
    %{data: %{token: token}}
  end
end
