defmodule VideoroomWeb.RoomJsonTest do
  use VideoroomWeb.ConnCase, async: false

  alias Jellyfish.Room
  alias Videoroom.Test.Peer
  alias Jellyfish.Notification.{PeerConnected, PeerDisconnected, RoomDeleted}

  @url Application.compile_env!(:jellyfish_server_sdk, :server_address)
  @peer_url "ws://#{@url}/socket/peer/websocket"

  @timeout 5000

  setup context do
    client = Jellyfish.Client.new()
    {:ok, notifier} = Jellyfish.Notifier.start()
    {:ok, []} = Jellyfish.Notifier.subscribe_server_notifications(notifier, :all)

    prev_env = Application.get_all_env(:videoroom)

    on_exit(fn ->
      delete_all_rooms()

      assert {:ok, []} = Room.get_all(client)

      Application.put_all_env([{:videoroom, prev_env}])
    end)

    context
    |> Map.merge(%{
      client: client,
      notifier: notifier
    })
  end

  setup_all do
    on_exit(&delete_all_rooms/0)
  end

  test "Room creates when peer joins and closes when it leaves", %{conn: conn, client: client} do
    {_name, token} = add_peer(conn)
    peer = join_room(token)
    assert {:ok, [%Room{peers: peers, id: jf_room_id}]} = Room.get_all(client)
    assert length(peers) == 1

    leave_room(peer)
    assert_receive {:jellyfish, %RoomDeleted{room_id: ^jf_room_id}}, @timeout
  end

  test "Two peers join the same room", %{conn: conn, client: client} do
    {meeting_name, token1} = add_peer(conn)
    {_name, token2} = add_peer(conn, meeting_name)

    assert {:ok, [%Room{peers: peers, id: jf_room_id}]} = Room.get_all(client)
    assert length(peers) == 2

    peer1 = join_room(token1)
    peer2 = join_room(token2)

    leave_room(peer1)

    leave_room(peer2)
    assert_receive {:jellyfish, %RoomDeleted{room_id: ^jf_room_id}}, @timeout
  end

  test "Two rooms at the same time", %{conn: conn, client: client} do
    {first_meeting, token1} = add_peer(conn)
    {_second_room, token2} = add_peer(conn)

    peer1 = join_room(token1)
    peer2 = join_room(token2)

    assert {:ok, rooms} = Room.get_all(client)
    assert length(rooms) == 2

    leave_room(peer2)

    assert_receive {:jellyfish, %RoomDeleted{}}, @timeout

    {_name, token3} = add_peer(conn, first_meeting)
    peer3 = join_room(token3)

    Room.get_all(client)

    assert {:ok, [%Room{peers: peers}]} = Room.get_all(client)
    assert length(peers) == 2

    leave_room(peer1)
    leave_room(peer3)
  end

  test "Peer joins and leaves in quick succession - the same room", %{conn: conn} do
    {meeting_name, token1} = add_peer(conn)
    peer1 = join_room(token1)

    {_name, token2} = add_peer(conn, meeting_name)
    leave_room(peer1, async: true)

    peer2 = join_room(token2)
    assert_receive {:jellyfish, %PeerDisconnected{}}, @timeout

    leave_room(peer2)
    assert_receive {:jellyfish, %RoomDeleted{}}, @timeout
  end

  test "Meeting doesn't create new Room when the Meeting crashed", %{conn: conn, client: client} do
    {meeting_name, _token1} = add_peer(conn)
    assert {:ok, [%Room{id: room_id}]} = Room.get_all(client)

    [{meeting, _key}] = Registry.lookup(Videoroom.Registry, meeting_name)
    Process.exit(meeting, :kill)

    await_meeting_restart(meeting_name, meeting)

    {_name, _token2} = add_peer(conn, meeting_name)

    assert Registry.count(Videoroom.Registry) == 1
    assert {:ok, [%Room{id: ^room_id}]} = Room.get_all(client)
  end

  describe "Peer timeout" do
    test "Room closes when no peers join within timeout", %{conn: conn, client: client} do
      {_name, _token} = add_peer(conn)
      assert {:ok, [%Room{id: jf_room_id}]} = Room.get_all(client)

      assert_receive {:jellyfish, %RoomDeleted{room_id: ^jf_room_id}}, @timeout
    end

    test "Room closes when all peers leave or time out", %{conn: conn, client: client} do
      {meeting_name, _token} = add_peer(conn)
      {_name, token} = add_peer(conn, meeting_name)

      assert {:ok, [%Room{id: jf_room_id, peers: peers}]} = Room.get_all(client)
      assert length(peers) == 2

      peer = join_room(token)
      leave_room(peer)

      assert_receive {:jellyfish, %RoomDeleted{room_id: ^jf_room_id}}, @timeout
    end

    test "Peer timeout persists after crash", %{conn: conn, client: client} do
      Application.put_env(:videoroom, :peer_join_timeout, 2000)

      {meeting_name, _token} = add_peer(conn)

      [{meeting, _key}] = Registry.lookup(Videoroom.Registry, meeting_name)
      Process.exit(meeting, :kill)

      await_meeting_restart(meeting_name, meeting)

      assert {:ok, [%Room{id: jf_room_id, peers: [_peer]}]} = Room.get_all(client)
      assert_receive {:jellyfish, %RoomDeleted{room_id: ^jf_room_id}}, @timeout
    end
  end

  defp add_peer(conn, name \\ nil) do
    name = if name, do: name, else: UUID.uuid4(:slug)
    conn = get(conn, ~p"/api/room/#{name}")
    assert(%{"token" => token} = json_response(conn, 200)["data"])

    {name, token}
  end

  defp join_room(token) do
    {:ok, peer} = Peer.start_link(@peer_url, token)

    assert_receive({:jellyfish, %PeerConnected{}}, @timeout)

    peer
  end

  defp leave_room(peer, async? \\ false) do
    send(peer, :terminate)

    unless async?,
      do: assert_receive({:jellyfish, %PeerDisconnected{}}, @timeout)
  end

  defp await_meeting_restart(name, prev_pid) do
    case Registry.lookup(Videoroom.Registry, name) do
      [{pid, _key}] when pid != prev_pid ->
        :ok

      _other ->
        Process.sleep(10)
        await_meeting_restart(name, prev_pid)
    end
  end

  defp delete_all_rooms() do
    client = Jellyfish.Client.new()
    {:ok, rooms} = Room.get_all(client)

    rooms
    |> Enum.each(fn room ->
      :ok = Room.delete(client, room.id)
    end)
  end
end
