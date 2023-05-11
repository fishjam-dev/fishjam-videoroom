defmodule Videoroom.Test.Peer do
  @moduledoc false

  # A module mocking the websocket connection from a WebRTC peer

  use WebSockex

  @spec start_link(binary | WebSockex.Conn.t(), any) :: {:ok, pid}
  def start_link(url, token) do
    connect(url, token)
  end

  @impl true
  def handle_info(:terminate, state) do
    {:close, state}
  end

  @impl true
  def handle_frame(_frame, state) do
    {:ok, state}
  end

  defp connect(url, token) do
    auth_msg =
      %{type: "controlMessage", data: %{type: "authRequest", token: token}}
      |> Jason.encode!()

    {:ok, client} = WebSockex.start_link(url, __MODULE__, %{peer_id: nil})
    :ok = WebSockex.send_frame(client, {:text, auth_msg})

    {:ok, client}
  end
end
