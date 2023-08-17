defmodule VideoroomWeb.RoomJSON do
  @moduledoc false

  @spec show(map()) :: %{data: map()}
  def show(%{token: token, jellyfish_address: jellyfish_address}) do
    %{data: %{token: token, jellyfish_address: jellyfish_address}}
  end
end
