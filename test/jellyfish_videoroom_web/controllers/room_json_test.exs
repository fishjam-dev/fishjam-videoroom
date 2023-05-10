defmodule JellyfishVideoroomWeb.RoomJsonTest do
  use JellyfishVideoroomWeb.ConnCase, async: false

  alias Jellyfish.Room, as: JellyfishRoom
  alias JellyfishVideoroom.Test.Peer

  @ws_url "ws://localhost:4000/socket/peer/websocket"
  @room_id "TestRoom"
  @api_latency 400

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

  setup_all _ctx do
    on_exit(fn ->
      client = Jellyfish.Client.new()

      {:ok, rooms} = JellyfishRoom.get_all(client)

      Enum.each(rooms, fn room ->
        JellyfishRoom.delete(client, room.id)
      end)
    end)
  end

  test "Room creates when peer joins and closes when it leaves", %{conn: conn, client: client} do
    token = add_peer(conn)
    peer = join_room(token)
    assert {:ok, [%JellyfishRoom{peers: peers, id: jf_room_id}]} = JellyfishRoom.get_all(client)
    assert length(peers) == 1

    leave_room(peer)
    Process.sleep(@api_latency)
    assert {:error, reason} = JellyfishRoom.get(client, jf_room_id)
    assert String.contains?(reason, "#{jf_room_id} does not exist")
  end

  test "Two peers join the same room", %{conn: conn, client: client} do
    token1 = add_peer(conn)
    token2 = add_peer(conn)

    peer1 = join_room(token1)
    peer2 = join_room(token2)

    assert {:ok, [%JellyfishRoom{peers: peers, id: _id}]} = JellyfishRoom.get_all(client)
    assert length(peers) == 2

    leave_room(peer1)
    Process.sleep(@api_latency)
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

    assert_receive {:jellyfish, {:peer_connected, room_id, peer_id}}, @api_latency
    assert_receive {:jellyfish, {:peer_disconnected, ^room_id, ^peer_id}}, @api_latency
    assert_receive {:jellyfish, {:peer_connected, _room_id, _peer_id}}, @api_latency

    Process.sleep(@api_latency)
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

    unless async?,
      do: assert_receive({:jellyfish, {:peer_connected, _room_id, _peer_id}}, @api_latency)

    peer
  end

  defp leave_room(peer, async? \\ false) do
    send(peer, :terminate)

    unless async?,
      do: assert_receive({:jellyfish, {:peer_disconnected, _room_id, _peer_id}}, @api_latency)
  end
end
