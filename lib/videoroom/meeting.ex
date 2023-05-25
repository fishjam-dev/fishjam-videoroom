defmodule Videoroom.Meeting do
  @moduledoc """
  A Module responsible for handling a room
  """
  use GenServer

  require Logger

  alias Jellyfish.ServerMessage.PeerCrashed
  alias Jellyfish.ServerMessage.PeerDisconnected
  alias Jellyfish.ServerMessage.RoomCrashed

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

      {:ok, %{client: client, notifier: notifier, name: args[:name], room_id: room.id}}
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
    case Room.add_peer(state.client, state.room_id, Jellyfish.Peer.WebRTC) do
      {:ok, _peer, token} ->
        {:reply, {:ok, token}, state}

      _error ->
        {:stop, :normal, state}
    end
  end

  @impl true
  def handle_info({:jellyfish, notification}, state) do
    case notification do
      %type{} when type in [PeerDisconnected, PeerCrashed] ->
        %{room_id: room_id, peer_id: peer_id} = notification

        Room.delete_peer(state.client, room_id, peer_id)
        {:ok, room} = Room.get(state.client, room_id)

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
  def terminate(:normal, state) do
    Room.delete(state.client, state.room_id)
    RoomRegistry.delete(state.room_id)
  end

  def terminate(_reason, _state), do: nil
end
