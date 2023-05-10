defmodule JellyfishVideoroom.JellyfishClient do
  @moduledoc false
  use GenServer

  alias Jellyfish.Room, as: JellyfishRoom

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

    {:ok, %{client: client, notifier: notifier, rooms: []}}
  end

  @impl true
  def handle_call({:join_room, id, opts}, _from, state) do
    {jellyfish_room_id, state} =
      case Enum.find(state.rooms, fn {room_id, _jf_id} -> id == room_id end) do
        {_id, jellyfish_room_id} ->
          {jellyfish_room_id, state}

        nil ->
          {:ok, jellyfish_room} = Jellyfish.Room.create(state.client, max_peers: opts[:max_peers])

          rooms = [{id, jellyfish_room.id} | state.rooms]
          {jellyfish_room.id, %{state | rooms: rooms}}
      end

    {:ok, _peer, token} = JellyfishRoom.add_peer(state.client, jellyfish_room_id, "webrtc")

    {:reply, {:ok, token}, state}
  end

  @impl true
  def handle_info({:jellyfish, notification}, state) do
    state =
      case notification do
        {:peer_disconnected, jf_room_id, peer_id} ->
          JellyfishRoom.delete_peer(state.client, jf_room_id, peer_id)
          maybe_remove_room(jf_room_id, state)

        _notification ->
          state
      end

    {:noreply, state}
  end

  defp maybe_remove_room(jellyfish_room_id, state) do
    {:ok, jellyfish_room} = JellyfishRoom.get(state.client, jellyfish_room_id)

    if Enum.empty?(jellyfish_room.peers) do
      JellyfishRoom.delete(state.client, jellyfish_room_id)

      rooms =
        Enum.filter(state.rooms, fn {_id, jf_room_id} -> jf_room_id != jellyfish_room_id end)

      %{state | rooms: rooms}
    else
      state
    end
  end
end
