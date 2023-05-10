defmodule JellyfishVideoroom.Test.Peer do
  use WebSockex

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
