defmodule Videoroom.Test.Peer do
  @moduledoc false

  # A module mocking the websocket connection from a WebRTC peer

  use WebSockex

  alias Jellyfish.PeerMessage
  alias Jellyfish.PeerMessage.AuthRequest

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
    auth_request =
      %PeerMessage{content: {:auth_request, %AuthRequest{token: token}}} |> PeerMessage.encode()

    {:ok, client} = WebSockex.start_link(url, __MODULE__, [])
    :ok = WebSockex.send_frame(client, {:binary, auth_request})

    {:ok, client}
  end
end
