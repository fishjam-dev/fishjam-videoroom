defmodule Videoroom.Meeting do
  @moduledoc """
  A Module responsible for handling a room.
  """
  use GenServer, restart: :transient

  require Logger

  alias Jellyfish.{Peer, Room}
  alias Jellyfish.ServerMessage.{PeerConnected, PeerCrashed, PeerDisconnected, RoomCrashed}

  alias Videoroom.RoomRegistry

  defmodule State do
    @moduledoc false

    @enforce_keys [
      :name,
      :client,
      :notifier,
      :room_id,
      :peer_timers,
      :peer_timeout
    ]

    defstruct @enforce_keys
  end

  @type name :: binary()

  # Api

  @spec start_link(name()) :: GenServer.on_start()
  def start_link(name) do
    GenServer.start_link(__MODULE__, name, name: registry_id(name))
  end

  @spec add_peer(name()) :: {:ok, Room.peer_token()} | {:error, binary()}
  def add_peer(meeting_name) do
    try do
      GenServer.call(registry_id(meeting_name), :add_peer)
    catch
      :exit, {:noproc, _error} ->
        {:error, "Failed to call add peer"}
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

      peer_timeout = Application.fetch_env!(:videoroom, :peer_join_timeout)
      peer_timers = restore_peer_timers(room.peers, peer_timeout)

      Logger.info("Created meeting")

      {:ok,
       %State{
         client: client,
         notifier: notifier,
         name: name,
         room_id: room.id,
         peer_timers: peer_timers,
         peer_timeout: peer_timeout
       }}
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

  defp restore_peer_timers(peers, timeout) do
    peers
    |> Map.new(fn %Peer{id: peer_id, status: status} ->
      case status do
        :connected ->
          {peer_id, nil}

        :disconnected ->
          timer = Process.send_after(self(), {:peer_timeout, peer_id}, timeout)
          {peer_id, timer}
      end
    end)
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

        timer = Process.send_after(self(), {:peer_timeout, peer.id}, state.peer_timeout)
        peer_timers = Map.put(state.peer_timers, peer.id, timer)

        {:reply, {:ok, token}, %{state | peer_timers: peer_timers}}

      _error ->
        Logger.warning("Failed to add peer")
        {:reply, {:error, "Failed to add peer"}, state}
    end
  end

  @impl true
  # Handle specific notifications for the current room
  def handle_info({:jellyfish, %type{room_id: id} = notification}, %{room_id: id} = state)
      when type in [PeerConnected, PeerDisconnected, PeerCrashed, RoomCrashed] do
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

  def handle_info({:peer_timeout, peer_id}, state) do
    Logger.info("Peer #{peer_id} timed out")
    delete_peer(peer_id, state)
  end

  defp handle_notification(%PeerConnected{peer_id: peer_id}, state) do
    {timer, peer_timers} = Map.get_and_update(state.peer_timers, peer_id, fn p -> {p, nil} end)

    Process.cancel_timer(timer)

    {:noreply, %{state | peer_timers: peer_timers}}
  end

  defp handle_notification(%type{peer_id: peer_id}, state)
       when type in [PeerDisconnected, PeerCrashed] do
    delete_peer(peer_id, state)
  end

  defp handle_notification(%RoomCrashed{}, state) do
    Logger.warning("Room #{state.room_id} crashed")
    {:stop, :normal, state}
  end

  defp delete_peer(peer_id, state) do
    Room.delete_peer(state.client, state.room_id, peer_id)

    peer_timers = Map.delete(state.peer_timers, peer_id)
    state = %{state | peer_timers: peer_timers}

    if Enum.empty?(peer_timers) do
      {:ok, room} = Room.get(state.client, state.room_id)

      if not Enum.empty?(room.peers) do
        Logger.error("Deleting non-empty room")
      end

      Logger.info("Deleted meeting")
      {:stop, :normal, state}
    else
      {:noreply, state}
    end
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
