defmodule JellyfishVideoroomWeb.RoomJSON do
  @moduledoc false

  def show(%{token: token}) do
    %{data: %{token: token}}
  end
end
