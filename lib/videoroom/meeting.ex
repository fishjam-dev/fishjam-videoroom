defmodule Videoroom.Meeting do
  @moduledoc """
  A Module responsible for handling a room.
  """
  use GenServer, restart: :transient

  require Logger

  alias Jellyfish.ServerMessage.PeerCrashed
  alias Jellyfish.ServerMessage.PeerDisconnected
  alias Jellyfish.ServerMessage.RoomCrashed

  alias Jellyfish.Room
  alias Videoroom.RoomRegistry

  # Api

  @spec start_link(Keyword.t()) :: GenServer.on_start()
  def start_link(args) do
    GenServer.start_link(__MODULE__, args, name: registry_id(args[:name]))
  end

  @spec add_peer(binary()) :: {:ok, binary()} | {:error, binary()}
  def add_peer(meeting_name) do
    try do
      GenServer.call(registry_id(meeting_name), :add_peer)
    catch
      :exit, {:noproc, _error} ->
        {:error, "Failed to add peer"}
    end
  end

  # Callbacks

  @impl true
  def init(args) do
    args = %{
      name: Keyword.fetch!(args, :name),
      max_peers: Keyword.get(args, :max_peers)
    }

    Logger.metadata(room_name: args.name)

    client = Jellyfish.Client.new()

    with {:ok, notifier} <- Jellyfish.Notifier.start(),
         {:ok, room} <- find_or_create_room(client, args) do
      Process.monitor(notifier)

      Logger.info("Created meeting")

      {:ok, %{client: client, notifier: notifier, name: args.name, room_id: room.id}}
    else
      {:error, reason} ->
        raise "Failed to create a meeting, reason: #{inspect(reason)}"
    end
  end

  @spec find_or_create_room(Jellyfish.Client.t(), %{name: binary(), max_peers: integer()}) ::
          {:ok, Room.t()} | {:error, atom() | binary()}
  defp find_or_create_room(client, args) do
    with {:ok, room_id} <- RoomRegistry.lookup(args.name),
         {:ok, room} <- Room.get(client, room_id) do
      {:ok, room}
    else
      {:error, :unregistered} ->
        create_new_room(client, args)

      error ->
        handle_room_error(error, client, args)
    end
  end

  defp create_new_room(client, args) do
    case Room.create(client, max_peers: args.max_peers) do
      {:ok, room} ->
        RoomRegistry.insert_new(args.name, room.id)
        {:ok, room}

      error ->
        error
    end
  end

  defp handle_room_error({:error, reason} = error, client, args) do
    if String.contains?(reason, "does not exist") do
      RoomRegistry.delete(args.name)
      create_new_room(client, args)
    else
      error
    end
  end

  @impl true
  def handle_call(:add_peer, _from, state) do
    case Room.add_peer(state.client, state.room_id, Jellyfish.Peer.WebRTC) do
      {:ok, peer, token} ->
        Logger.info("Added peer #{peer.id}")
        {:reply, {:ok, token}, state}

      _error ->
        Logger.warning("Failed to add peer")
        {:reply, {:error, "Failed to add peer"}, state}
    end
  end

  @impl true
  def handle_info({:jellyfish, %type{} = notification}, state)
      when type in [PeerDisconnected, PeerCrashed, RoomCrashed] do
    if notification.room_id == state.room_id do
      Logger.info("jellyfish notification: #{inspect(notification)}")
      handle_notification(notification, state)
    else
      Logger.debug("jellyfish notification: #{inspect(notification)}")
      {:noreply, state}
    end
  end

  def handle_info({:jellyfish, notification}, state) do
    Logger.debug("jellyfish notification: #{inspect(notification)}")
    {:noreply, state}
  end

  def handle_info({:DOWN, _ref, :process, pid, _reason}, %{notifier: notifier})
      when pid == notifier do
    raise "Connection to jellyfish closed!"
  end

  defp handle_notification(%type{} = notification, state)
       when type in [PeerDisconnected, PeerCrashed] do
    %{room_id: room_id, peer_id: peer_id} = notification
    Room.delete_peer(state.client, room_id, peer_id)
    {:ok, room} = Room.get(state.client, room_id)

    if Enum.empty?(room.peers) do
      Logger.info("Deleted meeting")
      {:stop, :normal, state}
    else
      {:noreply, state}
    end
  end

  defp handle_notification(%RoomCrashed{}, state) do
    Logger.warning("Room #{state.room_id} crashed")
    {:stop, :normal, state}
  end

  @impl true
  def terminate(:normal, state) do
    Room.delete(state.client, state.room_id)
    RoomRegistry.delete(state.name)
  end

  def terminate(_reason, _state) do
    Logger.warning("Meeting crashed")
  end

  defp registry_id(name), do: {:via, Registry, {Videoroom.Registry, name}}
end
