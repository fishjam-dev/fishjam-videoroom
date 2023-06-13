defmodule VideoroomWeb.RoomJsonTest do
  use VideoroomWeb.ConnCase, async: false

  alias Jellyfish.Room
  alias Videoroom.Test.Peer
  alias Jellyfish.ServerMessage.{PeerConnected, PeerDisconnected}

  @url Application.compile_env!(:jellyfish_server_sdk, :server_address)
  @peer_url "ws://#{@url}/socket/peer/websocket"
  @default_room "MeinRoom"

  @timeout 5000

  defp validate_within_timeout(lambda, validator, timeout_at) do
    lambda_result = lambda.()

    cond do
      validator.(lambda_result) ->
        lambda_result

      :erlang.monotonic_time(:millisecond) > timeout_at ->
        flunk("Pattern didn't match within the timeout: #{inspect(lambda_result)}")

      true ->
        Process.sleep(10)
        validate_within_timeout(lambda, validator, timeout_at)
    end
  end

  defmacrop assert_within_timeout(
              pattern,
              lambda,
              timeout \\ @timeout
            ) do
    quote generated: true do
      unquote(pattern) =
        validate_within_timeout(
          unquote(lambda),
          &match?(unquote(pattern), &1),
          :erlang.monotonic_time(:millisecond) + unquote(timeout)
        )
    end
  end

  setup context do
    client = Jellyfish.Client.new()
    {:ok, notifier} = Jellyfish.Notifier.start()

    assert {:ok, []} = Room.get_all(client)

    prev_env = Application.get_all_env(:videoroom)

    on_exit(fn ->
      assert_within_timeout({:ok, []}, fn -> Room.get_all(client) end)
      Application.put_all_env([{:videoroom, prev_env}])
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
    assert_within_timeout({:error, reason}, fn -> Room.get(client, jf_room_id) end)

    assert String.contains?(reason, "#{jf_room_id} does not exist")
  end

  test "Two peers join the same room", %{conn: conn, client: client} do
    token1 = add_peer(conn)
    token2 = add_peer(conn)

    assert {:ok, [%Room{peers: peers, id: _id}]} = Room.get_all(client)
    assert length(peers) == 2

    peer1 = join_room(token1)
    peer2 = join_room(token2)

    leave_room(peer1)
    assert_within_timeout({:ok, [%Room{peers: [_peer], id: _id}]}, fn -> Room.get_all(client) end)

    leave_room(peer2)
  end

  test "Two rooms at the same time", %{conn: conn, client: client} do
    second_room_name = "SecondRoom"

    token1 = add_peer(conn)
    token2 = add_peer(conn, second_room_name)

    assert {:ok, rooms} = Room.get_all(client)
    assert length(rooms) == 2

    peer1 = join_room(token1)
    peer2 = join_room(token2)

    leave_room(peer2)

    assert_within_timeout({:ok, [_room]}, fn -> Room.get_all(client) end)

    token3 = add_peer(conn)
    peer3 = join_room(token3)

    assert {:ok, [%Room{peers: peers}]} = Room.get_all(client)
    assert length(peers) == 2

    leave_room(peer1)
    leave_room(peer3)
  end

  test "Peer joins and leaves in quick succession", %{conn: conn, client: client} do
    token1 = add_peer(conn)
    peer1 = join_room(token1, async: true)
    leave_room(peer1, async: true)

    token2 = add_peer(conn)
    peer2 = join_room(token2, async: true)

    assert_receive {:jellyfish, %PeerConnected{room_id: room_id, peer_id: peer_id}}, @timeout

    assert_receive {:jellyfish, %PeerDisconnected{room_id: ^room_id, peer_id: ^peer_id}},
                   @timeout

    assert_receive {:jellyfish, %PeerConnected{}}, @timeout

    assert_within_timeout({:ok, [%Room{peers: [_peer], id: _id}]}, fn -> Room.get_all(client) end)

    leave_room(peer2)
  end

  test "Meeting doesn't create new Room when the Meeting crashed", %{conn: conn, client: client} do
    token1 = add_peer(conn)
    assert {:ok, [%Room{id: room_id}]} = Room.get_all(client)

    [{meeting, _key}] = Registry.lookup(Videoroom.Registry, @default_room)
    Process.exit(meeting, :kill)

    await_meeting_restart(@default_room, meeting)

    token2 = add_peer(conn)

    assert Registry.count(Videoroom.Registry) == 1
    assert {:ok, [%Room{id: ^room_id}]} = Room.get_all(client)

    # Cleanup
    [token1, token2] |> Enum.map(&join_room/1) |> Enum.map(&leave_room/1)
  end

  describe "Peer timeout" do
    test "Room closes when no peers join within timeout", %{conn: conn, client: client} do
      Application.put_env(:videoroom, :peer_join_timeout, 500)

      _token = add_peer(conn)
      assert {:ok, [%Room{}]} = Room.get_all(client)

      assert_within_timeout({:ok, []}, fn -> Room.get_all(client) end)
    end

    test "Room closes when all peers leave or time out", %{conn: conn, client: client} do
      _token = add_peer(conn)
      token = add_peer(conn)

      assert {:ok, [%Room{peers: peers}]} = Room.get_all(client)
      assert length(peers) == 2

      peer = join_room(token)
      leave_room(peer)

      assert_within_timeout({:ok, [%Room{peers: [_peer]}]}, fn -> Room.get_all(client) end)

      assert_within_timeout({:ok, []}, fn -> Room.get_all(client) end)
    end

    test "Peer timeout persists after crash", %{conn: conn, client: client} do
      Application.put_env(:videoroom, :peer_join_timeout, 2000)

      _token = add_peer(conn)

      [{meeting, _key}] = Registry.lookup(Videoroom.Registry, @default_room)
      Process.exit(meeting, :kill)

      await_meeting_restart(@default_room, meeting)

      assert {:ok, [%Room{peers: [_peer]}]} = Room.get_all(client)
      assert_within_timeout({:ok, []}, fn -> Room.get_all(client) end)
    end
  end

  defp add_peer(conn, room_name \\ @default_room) do
    conn = get(conn, ~p"/api/room/#{room_name}")
    assert(%{"token" => token} = json_response(conn, 200)["data"])

    token
  end

  defp join_room(token, async? \\ false) do
    {:ok, peer} = Peer.start_link(@peer_url, token)

    unless async?,
      do: assert_receive({:jellyfish, %PeerConnected{}}, @timeout)

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
end
