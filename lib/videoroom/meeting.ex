defmodule Videoroom.Meeting do
  @moduledoc """
  A Module responsible for handling a room
  """
  use GenServer

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

  @spec add_peer(pid()) :: {:ok, binary()} | {:error, binary()}
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
        raise("Failed to create a meeting, reason: #{inspect(reason)}")
    end
  end

  defp find_or_create_room(client, opts) do
    name = opts[:name]

    with [{^name, room_id}] <- RoomRegistry.lookup(name),
         {:ok, room} <- Room.get(client, room_id) do
      {:ok, room}
    else
      _error ->
        case Room.create(client, max_peers: opts[:max_peers]) do
          {:ok, room} ->
            RoomRegistry.insert_new(name, room.id)
            {:ok, room}

          error ->
            error
        end
    end
  end

  @impl true
  def handle_call({:add_peer}, _from, state) do
    case Room.add_peer(state.client, state.room_id, Jellyfish.Peer.WebRTC) do
      {:ok, _peer, token} ->
        {:reply, {:ok, token}, state}

      _error ->
        {:reply, {:error, "Failed to add peer"}, state}
    end
  end

  @impl true
  def handle_info({:jellyfish, %type{} = notification}, state)
      when type in [PeerDisconnected, PeerCrashed, RoomCrashed] do
    if notification.room_id == state.room_id do
      handle_notification(notification, state)
    else
      {:noreply, state}
    end
  end

  def handle_info({:jellyfish, _notification}, state) do
    {:noreply, state}
  end

  def handle_info({:DOWN, _ref, :process, pid, _reason}, state) do
    if pid == state.notifier do
      raise("Connection to jellyfish closed!")
    end
  end

  defp handle_notification(notification, state) do
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
    end
  end

  @impl true
  def terminate(:normal, state) do
    Room.delete(state.client, state.room_id)
    RoomRegistry.delete(state.room_id)
  end

  def terminate(_reason, _state), do: nil
end
