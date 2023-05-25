defmodule Videoroom.Meeting do
  @moduledoc """
  A Module responsible for handling a room
  """
  use GenServer

  require Logger

  alias Jellyfish.Server.ControlMessage.PeerCrashed
  alias Jellyfish.Server.ControlMessage.PeerDisconnected
  alias Jellyfish.Server.ControlMessage.RoomCrashed

  alias Jellyfish.Room
  alias Videoroom.RoomRegistry

  # Api

  @spec start_link(Keyword.t()) :: GenServer.on_start()
  def start_link(args) do
    GenServer.start_link(__MODULE__, args,
      name: {:via, Registry, {Videoroom.Registry, args[:name]}}
    )
  end

  @spec add_peer(pid()) :: {:ok, binary()}
  def add_peer(meeting) do
    GenServer.call(meeting, {:add_peer})
  end

  # Callbacks

  @impl true
  def init(args) do
    client = Jellyfish.Client.new()

    with {:ok, notifier} <- Jellyfish.Notifier.start(),
         {:ok, room} <- find_or_create_room(client, args) do
      Process.monitor(notifier)

      {:ok, %{client: client, notifier: notifier, room_id: room.id}}
    else
      {:error, reason} ->
        raise("Failed to create room, reason: #{inspect(reason)}")
    end
  end

  defp find_or_create_room(client, opts) do
    with [{_name, room_id}] <- RoomRegistry.lookup(opts[:name]),
         {:ok, room} <- Room.get(client, room_id) do
      {:ok, room}
    else
      _error ->
        {:ok, room} = Room.create(client, max_peers: opts[:max_peers])
        RoomRegistry.insert_new(opts[:name], room.id)
        {:ok, room}
    end
  end

  @impl true
  def handle_call({:add_peer}, _from, state) do
    {:ok, _peer, token} = Room.add_peer(state.client, state.room_id, Jellyfish.Peer.WebRTC)
    {:reply, {:ok, token}, state}
  end

  @impl true
  def handle_info({:jellyfish, notification}, state) do
    case notification do
      %type{} when type in [PeerDisconnected, PeerCrashed] ->
        %{room_id: room_id, peer_id: _peer_id} = notification

        room = Room.get(state.client, room_id)

        if Enum.empty?(room.peers) do
          {:stop, :normal, state}
        else
          {:noreply, state}
        end

      %RoomCrashed{room_id: _room_id} ->
        {:stop, :normal, state}

      _other ->
        {:noreply, state}
    end
  end

  def handle_info({:DOWN, _ref, :process, pid, _reason}, state) do
    if pid == state.notifier do
      raise("Connection to jellyfish closed!")
    end
  end

  @impl true
  def terminate(:normal, _state) do
    # close jf_room
    # remove mapping from room registry
  end

  def terminate(_reason, _state) do
  end
end
