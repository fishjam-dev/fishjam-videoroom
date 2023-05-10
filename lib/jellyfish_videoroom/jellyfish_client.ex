defmodule JellyfishVideoroom.JellyfishClient do
  use GenServer

  alias Jellyfish.Room, as: JellyfishRoom

  # Client

  def start_link(args) do
    GenServer.start_link(__MODULE__, args, name: __MODULE__)
  end

  def join_room(id) do
    GenServer.call(__MODULE__, {:join_room, id})
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
  def handle_call({:join_room, id}, _from, state) do
    {jellyfish_room_id, state} =
      case Enum.find(state.rooms, fn {room_id, _jf_id} -> id == room_id end) do
        {_id, jellyfish_room_id} ->
          {jellyfish_room_id, state}

        nil ->
          {:ok, jellyfish_room} = Jellyfish.Room.create(state.client, max_peers: 3)

          rooms = [{id, jellyfish_room.id} | state.rooms]
          {jellyfish_room.id, %{state | rooms: rooms}}
      end

    {:ok, _peer, token} = JellyfishRoom.add_peer(state.client, jellyfish_room_id, "webrtc")

    {:reply, {:ok, token}, state}
  end

  @impl true
  def handle_info({:jellyfish, {type, jf_room_id, peer_id}}, state) do
    state =
      case type do
        :peer_disconnected ->
          maybe_remove_room(jf_room_id, state)

        _type ->
          state
      end

    IO.inspect({type, jf_room_id, peer_id}, label: :from_jellyfish)
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
