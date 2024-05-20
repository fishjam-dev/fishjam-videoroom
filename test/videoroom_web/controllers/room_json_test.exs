defmodule VideoroomWeb.RoomJsonTest do
  use VideoroomWeb.ConnCase, async: false

  alias Jellyfish.Room
  alias Videoroom.Test.Peer
  alias Jellyfish.Notification.{PeerConnected, PeerDisconnected, RoomCreated, RoomDeleted}

  @url Application.compile_env!(:fishjam_server_sdk, :server_address)
  @peer_url "ws://#{@url}/socket/peer/websocket"

  @timeout 5000

  setup context do
    client = Jellyfish.Client.new()
    {:ok, notifier} = Jellyfish.WSNotifier.start()
    :ok = Jellyfish.WSNotifier.subscribe_server_notifications(notifier)

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

  test "Room creates when peer joins and closes when it leaves", %{conn: conn, client: client} do
    {_name, token} = add_peer(conn)
    peer = join_room(token)
    assert {:ok, [%Room{peers: peers, id: jf_room_id}]} = Room.get_all(client)
    assert length(peers) == 1

    leave_room(peer)
    assert_receive {:fishjam, %RoomDeleted{room_id: ^jf_room_id}}, @timeout
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
    assert_receive {:fishjam, %RoomDeleted{room_id: ^jf_room_id}}, @timeout
  end

  test "Two rooms at the same time", %{conn: conn, client: client} do
    {first_meeting, token1} = add_peer(conn)
    {_second_room, token2} = add_peer(conn)

    peer1 = join_room(token1)
    peer2 = join_room(token2)

    assert {:ok, rooms} = Room.get_all(client)
    assert length(rooms) == 2

    leave_room(peer2)

    assert_receive {:fishjam, %RoomDeleted{}}, @timeout

    {_name, token3} = add_peer(conn, first_meeting)
    peer3 = join_room(token3)

    assert {:ok, [%Room{peers: peers}]} = Room.get_all(client)
    assert length(peers) == 2

    leave_room(peer1)
    leave_room(peer3)

    assert_receive {:fishjam, %RoomDeleted{}}, @timeout
  end

  test "Peer joins and leaves in quick succession - the same room", %{conn: conn} do
    {meeting_name, token1} = add_peer(conn)
    peer1 = join_room(token1)

    {_name, token2} = add_peer(conn, meeting_name)
    leave_room(peer1, async: true)

    peer2 = join_room(token2)
    assert_receive {:fishjam, %PeerDisconnected{}}, @timeout

    leave_room(peer2)
    assert_receive {:fishjam, %RoomDeleted{}}, @timeout
  end

  describe "Peer timeout" do
    test "Room closes when no peers join within timeout", %{conn: conn, client: client} do
      {_name, _token} = add_peer(conn)
      assert {:ok, [%Room{id: jf_room_id}]} = Room.get_all(client)

      assert_receive {:fishjam, %RoomDeleted{room_id: ^jf_room_id}}, @timeout
    end

    test "Room closes when all peers leave or time out", %{conn: conn, client: client} do
      {meeting_name, _token} = add_peer(conn)
      {_name, token} = add_peer(conn, meeting_name)

      assert {:ok, [%Room{id: jf_room_id, peers: peers}]} = Room.get_all(client)
      assert length(peers) == 2

      peer = join_room(token)
      leave_room(peer)

      assert_receive {:fishjam, %RoomDeleted{room_id: ^jf_room_id}}, @timeout
    end

    test "Meeting is deleted if room doesn't exist", %{conn: conn, client: client} do
      {meeting_name, token} = add_peer(conn)

      assert {:ok, [%Room{id: jf_room_id, peers: peers}]} = Room.get_all(client)
      assert length(peers) == 1
      _peer = join_room(token)

      assert :ok = Room.delete(client, jf_room_id)

      assert_receive {:fishjam, %RoomDeleted{room_id: ^jf_room_id}}, @timeout

      conn = get(conn, ~p"/api/room/#{meeting_name}")
      assert json_response(conn, 503)["errors"] == "Meeting is being removed"

      {_name, _token} = add_peer(conn, meeting_name)
    end
  end

  describe "Notifier down" do
    test "Can join room after notifier exits with normal", %{
      conn: conn,
      client: client
    } do
      room_service_pid = Process.whereis(Videoroom.RoomService)

      state = :sys.get_state(room_service_pid)

      {_fishjam_address, notifier} = state.notifier

      _ws_caller = :sys.get_state(notifier)[:caller_pid]

      :erlang.trace(room_service_pid, true, [:receive])

      Process.exit(notifier, :terminate)

      Process.sleep(100)

      {_name, _token} = add_peer(conn)
      assert {:ok, [%Room{id: jf_room_id}]} = Room.get_all(client)

      notification = %RoomCreated{room_id: jf_room_id}

      assert_receive {:fishjam, ^notification}, @timeout

      assert_receive {:trace, _pid, :receive, {:fishjam, ^notification}},
                     @timeout

      assert_receive {:fishjam, %RoomDeleted{}}, @timeout
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

    assert_receive({:fishjam, %PeerConnected{}}, @timeout)

    peer
  end

  defp leave_room(peer, async? \\ false) do
    send(peer, :terminate)

    unless async?,
      do: assert_receive({:fishjam, %PeerDisconnected{}}, @timeout)
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
