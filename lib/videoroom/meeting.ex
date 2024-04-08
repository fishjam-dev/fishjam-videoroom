defmodule Videoroom.Meeting do
  @moduledoc """
  A Module responsible for handling a room.
  """
  use GenServer, restart: :transient

  require Logger

  alias Jellyfish.Component
  alias Jellyfish.Room
  alias Jellyfish.Notification.{PeerConnected, PeerCrashed, PeerDisconnected, RoomCrashed}

  alias Videoroom.RoomRegistry

  defmodule State do
    @moduledoc false

    @enforce_keys [
      :name,
      :client,
      :room_id,
      :peer_timers,
      :peer_timeout,
      :jellyfish_address
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

  # Callbacks

  @impl true
  def init(%{name: name, jellyfish_address: jellyfish_address}) do
    Logger.metadata(room_name: name)

    client = Jellyfish.Client.new(server_address: jellyfish_address)

    with {:ok, room, jellyfish_address} <- create_new_room(client, name) do
      peer_timeout = Application.fetch_env!(:videoroom, :peer_join_timeout)

      client = Jellyfish.Client.update_address(client, jellyfish_address)

      Logger.info("Created meeting room id: #{room.id}")

      {:ok,
       %State{
         client: client,
         name: name,
         room_id: room.id,
         peer_timers: %{},
         peer_timeout: peer_timeout,
         jellyfish_address: jellyfish_address
       }}
    else
      {:error, reason} ->
        Logger.error("Failed to create a meeting, reason: #{inspect(reason)}")
        raise "Failed to create a meeting, reason: #{inspect(reason)}"
    end
  end

  defp create_new_room(client, name) do
    with {:ok, room, jellyfish_address} <- Room.create(client, video_codec: "h264"),
         client <- Jellyfish.Client.update_address(client, jellyfish_address),
         :ok <- add_room_to_registry(client, name, room) do
      {:ok, room, jellyfish_address}
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
    case Room.add_peer(state.client, state.room_id, Jellyfish.Peer.WebRTC) do
      {:ok, peer, token} ->
        Logger.info("Added peer #{peer.id}")

        timer = Process.send_after(self(), {:peer_timeout, peer.id}, state.peer_timeout)
        state = put_in(state.peer_timers[peer.id], timer)

        {:reply, {:ok, token, state.jellyfish_address}, state}

      error ->
        Logger.error(
          "Failed to add peer, because of error: #{inspect(error)} on jellyfish: #{state.jellyfish_address}"
        )

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
        Logger.error("Error when starting recording #{error}")
        {:reply, {:error, "Failed to start recording"}, state}
    end
  end

  @impl true
  def handle_info({:jellyfish, notification}, state) do
    Logger.info("Jellyfish notification: #{inspect(notification)}")
    handle_notification(notification, state)
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

  defp handle_notification(notification, state) do
    Logger.info("Notification: #{inspect(notification)}")
    {:noreply, state}
  end

  defp delete_peer(peer_id, state) do
    Room.delete_peer(state.client, state.room_id, peer_id)

    peer_timers = Map.delete(state.peer_timers, peer_id)
    state = %{state | peer_timers: peer_timers}

    if Enum.empty?(peer_timers) do
      with {:ok, room} <- Room.get(state.client, state.room_id),
           true <- Enum.empty?(room.peers) do
        :ok
      else
        {:error, reason} ->
          Logger.error("Error when deleting meeting #{reason}")

        false ->
          Logger.error("Deleting non-empty room")
      end

      Logger.info("Deleted meeting")
      {:stop, :normal, state}
    else
      {:noreply, state}
    end
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
