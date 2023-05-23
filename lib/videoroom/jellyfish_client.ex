defmodule Videoroom.JellyfishClient do
  @moduledoc false
  use GenServer

  require Logger

  alias Jellyfish.Server.ControlMessage.PeerCrashed
  alias Jellyfish.Server.ControlMessage.PeerDisconnected
  alias Jellyfish.Server.ControlMessage.RoomCrashed

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

    start_notifier()

    {:ok, %{client: client, notifier: nil, rooms: Rooms.new()}}
  end

  @impl true
  def handle_call({:join_room, name, opts}, _from, state) do
    room =
      case Rooms.fetch_by_name(state.rooms, name) do
        {:ok, room} ->
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

          remove_room_if_empty(room, %{state | rooms: rooms})

        %RoomCrashed{room_id: jf_room_id} ->
          {:ok, room} = Rooms.fetch_by_jf_id(state.rooms, jf_room_id)
          rooms = Rooms.delete(state.rooms, room)
          %{state | rooms: rooms}

        _other ->
          state
      end

    {:noreply, state}
  end

  def handle_info({:DOWN, _ref, :process, pid, _reason}, state) do
    if pid == state.notifier do
      raise("Connection to jellyfish closed!")
    end
  end

  def handle_info({:start_notifier, dwell, max_tries}, state) when max_tries >= 1 do
    with {:ok, notifier} <- Jellyfish.Notifier.start() do
      Logger.info("Connected to jellyfish server")

      Process.monitor(notifier)

      {:noreply, %{state | notifier: notifier}}
    else
      {:error, _reason} ->
        case max_tries do
          1 ->
            raise("Couldn't establish connection with jellyfish!")

          max_tries ->
            Logger.info("Retrying connection to jellyfish")
            Process.send_after(self(), {:start_notifier, dwell, max_tries - 1}, dwell)
            {:noreply, state}
        end
    end
  end

  defp start_notifier(dwell \\ 1000, max_tries \\ 60) do
    send(self(), {:start_notifier, dwell, max_tries})
  end

  defp remove_room_if_empty(room, state) do
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
