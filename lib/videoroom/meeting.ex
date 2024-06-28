defmodule Videoroom.Meeting do
  @moduledoc """
  A Module responsible for handling a room.
  """
  use GenServer, restart: :transient

  require Logger

  alias Fishjam.Component
  alias Fishjam.Room
  alias Fishjam.Notification.{PeerCrashed, RoomCrashed, RoomDeleted}

  alias Videoroom.RoomRegistry

  defmodule State do
    @moduledoc false

    @enforce_keys [
      :name,
      :client,
      :room_id
    ]

    defstruct @enforce_keys
  end

  @type name :: binary()

  @type options() :: %{
          name: binary(),
          server_address: String.t()
        }

  # Api

  @spec start_link(options()) :: GenServer.on_start()
  def start_link(%{name: name} = opts) do
    GenServer.start_link(__MODULE__, opts, name: registry_id(name))
  end

  @spec add_peer(name()) :: {:ok, Room.peer_token()} | {:error, binary()}
  def add_peer(meeting_name) do
    try do
      GenServer.call(registry_id(meeting_name), :add_peer)
    catch
      :exit, {:noproc, error} ->
        Logger.error(
          "Failed to call add peer because meeting #{meeting_name} doesn't exist, error: #{inspect(error)}"
        )

        {:error,
         "Failed to call add peer to meeting #{meeting_name} because of error: #{inspect(error)}"}

      :exit, {:room_not_exist, _} ->
        Logger.error(
          "Failed to call add peer because room created by #{meeting_name} doesn't exist on fishjam"
        )

        {:error,
         "Failed to call add peer because room created by #{meeting_name} doesn't exist on fishjam"}

      :exit, {:normal, _} ->
        Logger.error("Failed to call add peer because meeting is removed")
        {:error, "Meeting is being removed"}
    end
  end

  @spec start_recording(name()) :: {:ok, Component.Recording.t()} | {:error, binary()}
  def start_recording(meeting_name) do
    try do
      GenServer.call(registry_id(meeting_name), {:start_recording})
    catch
      :exit, {:noproc, error} ->
        Logger.error(
          "Failed to call start_recording because meeting #{meeting_name} doesn't exist, error: #{inspect(error)}"
        )

        {:error,
         "Failed to call start_recording to meeting #{meeting_name} because of error: #{inspect(error)}"}
    end
  end

  @spec stop(name()) :: :ok | {:error, binary()}
  def stop(meeting_name) do
    try do
      GenServer.stop(registry_id(meeting_name))
    catch
      :exit, {:noproc, error} ->
        Logger.error(
          "Failed to stop meeting #{meeting_name} because it doesn't exist, error: #{inspect(error)}"
        )

        {:error, "Failed to stop meeting #{meeting_name} because of error: #{inspect(error)}"}
    end
  end

  # Callbacks

  @impl true
  def init(%{name: name}) do
    Logger.metadata(room_name: name)
    fishjam_address = Application.fetch_env!(:videoroom, :fishjam_address)

    client = Fishjam.Client.new(server_address: fishjam_address)

    peer_disconnected_timeout = Application.fetch_env!(:videoroom, :peer_disconnected_timeout)
    peerless_purge_timeout = Application.fetch_env!(:videoroom, :peerless_purge_timeout)

    with {:ok, room} <-
           create_new_room(client, name,
             video_codec: :h264,
             peer_disconnected_timeout: peer_disconnected_timeout,
             peerless_purge_timeout: peerless_purge_timeout
           ) do
      Logger.info("Created meeting room id: #{room.id}")

      {:ok,
       %State{
         client: client,
         name: name,
         room_id: room.id
       }}
    else
      {:error, reason} ->
        Logger.error("Failed to create a meeting, reason: #{inspect(reason)}")
        raise "Failed to create a meeting, reason: #{inspect(reason)}"
    end
  end

  defp create_new_room(client, name, opts) do
    with {:ok, room, _fishjam_address} <- Room.create(client, opts),
         :ok <- add_room_to_registry(client, name, room) do
      {:ok, room}
    end
  end

  defp add_room_to_registry(client, name, room) do
    if RoomRegistry.insert_new(name, room.id) do
      :ok
    else
      Logger.warning("Inserting room with id #{room.id} to RoomRegistry failed")
      Room.delete(client, room.id)
      {:error, :registry_insert_failed}
    end
  end

  @impl true
  def handle_call(:add_peer, _from, state) do
    text = "Request failed: Room #{state.room_id} does not exist"

    case Room.add_peer(state.client, state.room_id, Fishjam.Peer.WebRTC) do
      {:ok, %{peer: peer, token: token}} ->
        Logger.info("Added peer #{peer.id}")

        {:reply, {:ok, token}, state}

      {:error, ^text} ->
        Logger.error("Failed to add peer, because of room #{state.room_id} does not exist")

        {:stop, :room_not_exist, {:error, "Failed to add peer"}, state}

      error ->
        Logger.error("Failed to add peer, because of error: #{inspect(error)}")

        {:reply, {:error, "Failed to add peer"}, state}
    end
  end

  @impl true
  def handle_call({:start_recording}, _from, state) do
    Logger.info("Starting recording: #{state.room_id}")

    case Room.add_component(state.client, state.room_id, %Component.Recording{}) do
      {:ok, component} ->
        {:reply, {:ok, component}, state}

      error ->
        Logger.error("Error when starting recording #{inspect(error)}")
        {:reply, {:error, "Failed to start recording"}, state}
    end
  end

  @impl true
  def handle_info({:fishjam, notification}, state) do
    Logger.info("Fishjam notification: #{inspect(notification)}")
    handle_notification(notification, state)
  end

  def handle_info({:peer_timeout, peer_id}, state) do
    Logger.info("Peer #{peer_id} timed out")
    delete_peer(peer_id, state)
  end

  defp handle_notification(%PeerCrashed{peer_id: peer_id}, state) do
    state = delete_peer(peer_id, state)
    {:noreply, state}
  end

  defp handle_notification(%RoomCrashed{}, state) do
    Logger.warning("Room #{state.room_id} crashed")
    {:stop, :normal, state}
  end

  defp handle_notification(%RoomDeleted{}, state) do
    Logger.info("Room #{state.room_id} was deleted")
    {:stop, :normal, state}
  end

  defp handle_notification(notification, state) do
    Logger.info("Notification: #{inspect(notification)}")
    {:noreply, state}
  end

  defp delete_peer(peer_id, state) do
    Room.delete_peer(state.client, state.room_id, peer_id)

    state
  end

  @impl true
  def terminate(reason, state) do
    if reason != :normal do
      Logger.warning("Meeting terminated abnormally with reason: #{inspect(reason)}")
    end

    Room.delete(state.client, state.room_id)
    RoomRegistry.delete(state.name)
  end

  defp registry_id(name), do: {:via, Registry, {Videoroom.Registry, name}}
end
