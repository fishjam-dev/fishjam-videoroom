defmodule JellyfishVideoroomWeb.RoomJsonTest do
  use JellyfishVideoroomWeb.ConnCase, async: false

  alias Jellyfish.Room, as: JellyfishRoom
  alias JellyfishVideoroom.Test.Peer

  @ws_url "ws://localhost:4000/socket/peer/websocket"
  @room_id "TestRoom"
  @api_latency 200

  setup context do
    client = Jellyfish.Client.new()
    {:ok, notifier} = Jellyfish.Notifier.start()

    assert {:ok, []} = JellyfishRoom.get_all(client)

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
    assert {:ok, [%JellyfishRoom{peers: peers, id: _id}]} = JellyfishRoom.get_all(client)
    assert length(peers) == 1

    leave_room(peer)
    assert {:error, reason} = JellyfishRoom.get(client, @room_id)
    assert String.contains?(reason, "#{@room_id} does not exist")
  end

  test "Two peers join the same room", %{conn: conn, client: client} do
    token1 = add_peer(conn)
    token2 = add_peer(conn)

    peer1 = join_room(token1)
    peer2 = join_room(token2)

    assert {:ok, [%JellyfishRoom{peers: peers, id: _id}]} = JellyfishRoom.get_all(client)
    assert length(peers) == 2

    Process.sleep(@api_latency)
    leave_room(peer1)
    assert {:ok, [%JellyfishRoom{peers: peers, id: _id}]} = JellyfishRoom.get_all(client)
    assert length(peers) == 1

    leave_room(peer2)
  end

  test "Peer joins and leaves in quick succession", %{conn: conn, client: client} do
    token = add_peer(conn)
    peer = join_room(token, async: true)
    leave_room(peer, async: true)

    token = add_peer(conn)
    peer = join_room(token, async: true)
    leave_room(peer, async: true)

    assert_receive({:jellyfish, {:peer_connected, room_id, peer_id}})
    assert_receive({:jellyfish, {:peer_disconnected, ^room_id, ^peer_id}})
    assert_receive({:jellyfish, {:peer_connected, _room_id, _peer_id}})

    assert {:ok, [%JellyfishRoom{peers: peers, id: _id}]} = JellyfishRoom.get_all(client)
    assert length(peers) == 1

    leave_room(peer)
  end

  defp add_peer(conn) do
    conn = get(conn, ~p"/api/room/#{@room_id}")
    assert(%{"token" => token} = json_response(conn, 200)["data"])
    token
  end

  defp join_room(token, async? \\ false) do
    {:ok, peer} = Peer.start_link(@ws_url, token)
    unless async?, do: assert_receive({:jellyfish, {:peer_connected, _room_id, _peer_id}})

    peer
  end

  defp leave_room(peer, async? \\ false) do
    send(peer, :terminate)
    unless async?, do: assert_receive({:jellyfish, {:peer_disconnected, _room_id, _peer_id}})
  end
end
