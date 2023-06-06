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
  def init(name) do
    Logger.metadata(room_name: name)

    client = Jellyfish.Client.new()

    with {:ok, notifier} <- Jellyfish.Notifier.start(),
         {:ok, room} <- find_or_create_room(client, name) do
      Process.monitor(notifier)

      Logger.info("Created meeting")

      {:ok, %{client: client, notifier: notifier, name: name, room_id: room.id}}
    else
      {:error, reason} ->
        raise "Failed to create a meeting, reason: #{inspect(reason)}"
    end
  end

  defp find_or_create_room(client, name) do
    with {:ok, room_id} <- RoomRegistry.lookup(name),
         {:ok, room} <- Room.get(client, room_id) do
      {:ok, room}
    else
      {:error, :unregistered} ->
        create_new_room(client, name)

      error ->
        handle_room_error(error, client, name)
    end
  end

  defp create_new_room(client, name) do
    case Room.create(client) do
      {:ok, room} ->
        RoomRegistry.insert_new(name, room.id)
        {:ok, room}

      error ->
        error
    end
  end

  defp handle_room_error({:error, reason} = error, client, name) do
    if String.contains?(reason, "does not exist") do
      RoomRegistry.delete(name)
      create_new_room(client, name)
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
  # Handle specific notifications for the current room
  def handle_info({:jellyfish, %type{room_id: id} = notification}, %{room_id: id} = state)
      when type in [PeerDisconnected, PeerCrashed, RoomCrashed] do
    Logger.info("jellyfish notification: #{inspect(notification)}")
    handle_notification(notification, state)
  end

  # Handle all other notifications, including ones from the other rooms
  def handle_info({:jellyfish, notification}, state) do
    Logger.debug("jellyfish notification: #{inspect(notification)}")
    {:noreply, state}
  end

  def handle_info({:DOWN, _ref, :process, pid, _reason}, %{notifier: pid}) do
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
