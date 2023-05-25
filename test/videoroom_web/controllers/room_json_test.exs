defmodule VideoroomWeb.RoomJsonTest do
  use VideoroomWeb.ConnCase, async: false

  alias Jellyfish.Room
  alias Videoroom.Test.Peer
  alias Jellyfish.ServerMessage.{PeerConnected, PeerDisconnected}

  @url Application.compile_env!(:jellyfish_server_sdk, :server_address)
  @peer_url "ws://#{@url}/socket/peer/websocket"

  @room_name "MeinRoom"
  @api_latency 400

  setup context do
    client = Jellyfish.Client.new()
    {:ok, notifier} = Jellyfish.Notifier.start()

    assert {:ok, []} = Room.get_all(client)

    on_exit(fn ->
      Process.sleep(@api_latency)
    end)

    context
    |> Map.merge(%{
      client: client,
      notifier: notifier
    })
  end

  test "Room creates when peer joins and closes when it leaves", %{conn: conn, client: client} do
    token = add_peer(conn)
    peer = join_room(token)
    assert {:ok, [%Room{peers: peers, id: jf_room_id}]} = Room.get_all(client)
    assert length(peers) == 1

    leave_room(peer)
    Process.sleep(@api_latency)
    assert {:error, reason} = Room.get(client, jf_room_id)
    assert String.contains?(reason, "#{jf_room_id} does not exist")
  end

  test "Two peers join the same room", %{conn: conn, client: client} do
    token1 = add_peer(conn)
    token2 = add_peer(conn)

    peer1 = join_room(token1)
    peer2 = join_room(token2)

    assert {:ok, [%Room{peers: peers, id: _id}]} = Room.get_all(client)
    assert length(peers) == 2

    leave_room(peer1)
    Process.sleep(@api_latency)
    assert {:ok, [%Room{peers: peers, id: _id}]} = Room.get_all(client)
    assert length(peers) == 1

    leave_room(peer2)
  end

  test "Peer joins and leaves in quick succession", %{conn: conn, client: client} do
    token1 = add_peer(conn)
    peer1 = join_room(token1, async: true)
    leave_room(peer1, async: true)

    token2 = add_peer(conn)
    peer2 = join_room(token2, async: true)

    assert_receive {:jellyfish, %PeerConnected{room_id: room_id, peer_id: peer_id}}, @api_latency

    assert_receive {:jellyfish, %PeerDisconnected{room_id: ^room_id, peer_id: ^peer_id}},
                   @api_latency

    assert_receive {:jellyfish, %PeerConnected{}}, @api_latency

    Process.sleep(@api_latency)
    assert {:ok, [%Room{peers: peers, id: _id}]} = Room.get_all(client)
    assert length(peers) == 1

    leave_room(peer2)
  end

  defp add_peer(conn) do
    conn = get(conn, ~p"/api/room/#{@room_name}")
    assert(%{"token" => token} = json_response(conn, 200)["data"])

    token
  end

  defp join_room(token, async? \\ false) do
    {:ok, peer} = Peer.start_link(@peer_url, token)

    unless async?,
      do: assert_receive({:jellyfish, %PeerConnected{}}, @api_latency)

    peer
  end

  defp leave_room(peer, async? \\ false) do
    send(peer, :terminate)

    unless async?,
      do: assert_receive({:jellyfish, %PeerDisconnected{}}, @api_latency)
  end
end
