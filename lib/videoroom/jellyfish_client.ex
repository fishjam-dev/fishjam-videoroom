defmodule Videoroom.JellyfishClient do
  @moduledoc false
  use GenServer

  alias Jellyfish.Server.ControlMessage.RoomCrashed
  alias Jellyfish.Server.ControlMessage.PeerDisconnected
  alias Jellyfish.Server.ControlMessage.PeerCrashed

  alias Jellyfish.Room, as: JellyfishRoom
  alias Videoroom.Rooms
  alias Videoroom.Rooms.Room

  @peer_timeout 60 * 1000

  # Client

  @spec start_link(any) :: :ignore | {:error, any} | {:ok, pid}
  def start_link(args) do
    GenServer.start_link(__MODULE__, args, name: __MODULE__)
  end

  @spec join_room(any, any) :: any
  def join_room(id, opts \\ [max_peers: nil]) do
    GenServer.call(__MODULE__, {:join_room, id, opts})
  end

  # Server

  @impl true
  def init(_opts) do
    client = Jellyfish.Client.new()
    {:ok, notifier} = Jellyfish.Notifier.start()
    Process.monitor(notifier)

    {:ok, %{client: client, notifier: notifier, rooms: Rooms.new()}}
  end

  @impl true
  def handle_call({:join_room, name, opts}, _from, state) do
    room =
      case Rooms.fetch_by_name(state.rooms, name) do
        {:ok, room} ->
          Jellyfish.Room.get(state.client, room.jf_id)
          room

        :error ->
          {:ok, jf_room} = Jellyfish.Room.create(state.client, max_peers: opts[:max_peers])

          %Room{
            name: name,
            jf_id: jf_room.id,
            peers: %{},
            peer_timeout: @peer_timeout
          }
      end

    {:ok, peer, token} = JellyfishRoom.add_peer(state.client, room.jf_id, Jellyfish.Peer.WebRTC)
    rooms = Rooms.add_peer(state.rooms, room, peer)

    {:reply, {:ok, token}, %{state | rooms: rooms}}
  end

  @impl true
  def handle_info({:jellyfish, notification}, state) do
    state =
      case notification do
        %type{} when type in [PeerDisconnected, PeerCrashed] ->
          %{room_id: jf_room_id, peer_id: peer_id} = notification
          JellyfishRoom.delete_peer(state.client, jf_room_id, peer_id)

          {:ok, room} = Rooms.fetch_by_jf_id(state.rooms, jf_room_id)
          rooms = Rooms.delete_peer(state.rooms, room, peer_id)

          maybe_remove_room(room, %{state | rooms: rooms})

        %RoomCrashed{room_id: jf_room_id} ->
          {:ok, room} = Rooms.fetch_by_jf_id(state.rooms, jf_room_id)
          rooms = Rooms.delete(state.rooms, room)
          %{state | rooms: rooms}

        _other ->
          state
      end

    {:noreply, state}
  end

  defp maybe_remove_room(room, state) do
    {:ok, jf_room} = JellyfishRoom.get(state.client, room.jf_id)

    if Enum.empty?(jf_room.peers) do
      JellyfishRoom.delete(state.client, room.jf_id)

      rooms = Rooms.delete(state.rooms, room)
      %{state | rooms: rooms}
    else
      state
    end
  end
end
