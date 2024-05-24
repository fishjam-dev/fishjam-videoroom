defmodule VideoroomWeb.RoomJSON do
  @moduledoc false

  @spec show(map()) :: %{data: map()}
  def show(%{token: token, fishjam_address: fishjam_address}) do
    %{data: %{token: token, fishjam_address: fishjam_address}}
  end
end
