defmodule Videoroom.RoomService do
  @moduledoc false
  use GenServer

  require Logger
  alias Jellyfish.Component
  alias Jellyfish.WSNotifier

  alias Videoroom.Meeting
  alias Videoroom.RoomRegistry

  @type jellyfish_address :: String.t()

  @spec start_link(any) :: GenServer.on_start()
  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @spec add_peer(Meeting.name()) ::
          {:ok, Jellyfish.Room.peer_token(), jellyfish_address()} | {:error, binary()}
  def add_peer(meeting_name) do
    GenServer.call(__MODULE__, {:add_peer, meeting_name})
  end

  # start recording
  @spec start_recording(Meeting.name()) :: {:ok, Component.Recording.t()} | {:error, binary()}
  def start_recording(meeting_name) do
    GenServer.call(__MODULE__, {:start_recording, meeting_name})
  end

  @impl true
  def init(_init_arg) do
    {:ok, supervisor} = DynamicSupervisor.start_link([])

    {:ok, %{supervisor: supervisor, notifier: nil, room_name_to_from: %{}}, {:continue, []}}
  end

  @impl true
  def handle_continue(_none, state) do
    notifier = start_notifier()

    {:noreply, %{state | notifier: notifier}}
  end

  @impl true
  def handle_call({:add_peer, room_name}, _from, state) do
    {jellyfish_address, _pid} = state.notifier

    case DynamicSupervisor.start_child(
           state.supervisor,
           {Videoroom.Meeting, %{name: room_name, jellyfish_address: jellyfish_address}}
         ) do
      {:error, {:already_started, _}} ->
        Logger.debug("Room with name #{room_name} is already started")

      {:error, error} ->
        Logger.error("During spawning child error occurs: #{inspect(error)}")

      _other ->
        nil
    end

    {:reply, Meeting.add_peer(room_name), state}
  end

  @impl true
  def handle_call({:start_recording, room_name}, _from, state) do
    {:reply, Meeting.start_recording(room_name), state}
  end

  @impl true
  def handle_info({:jellyfish, %{room_id: room_id} = notification}, state) do
    with {:ok, room_name} <- RoomRegistry.lookup_room(room_id),
         [{pid, _value}] <- Registry.lookup(Videoroom.Registry, room_name) do
      send(pid, {:jellyfish, notification})
    else
      _error ->
        Logger.warning(
          "Received notification #{inspect(notification)} which doesn't have a corresponding meeting"
        )
    end

    {:noreply, state}
  end

  @impl true
  def handle_info({:DOWN, _ref, :process, _object, _reason}, state) do
    Logger.warning("Jellyfish WSNotifier exited. Starting new notifier")

    notifier = start_notifier()

    {:noreply, %{state | notifier: notifier}}
  end

  @impl true
  def handle_info(msg, state) do
    Logger.warning("Ignored message: #{inspect(msg)}")

    {:noreply, state}
  end

  defp start_notifier() do
    notifier =
      :videoroom
      |> Application.fetch_env!(:jellyfish_addresses)
      |> Enum.reduce_while(nil, fn jellyfish_address, nil ->
        case WSNotifier.start(server_address: jellyfish_address) do
          {:ok, notifier} ->
            Logger.info("Successfully connected to #{jellyfish_address}")
            WSNotifier.subscribe_server_notifications(notifier)
            Process.monitor(notifier)
            {:halt, {jellyfish_address, notifier}}

          {:error, reason} ->
            Logger.warning(
              "Unable to connect to #{jellyfish_address}, reason: #{inspect(reason)}"
            )

            {:cont, nil}
        end
      end)

    if notifier == nil do
      raise("Unable to connect to any jellyfish")
    else
      notifier
    end
  end
end
