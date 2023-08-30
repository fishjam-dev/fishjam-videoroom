defmodule Videoroom.RoomService do
  @moduledoc false
  use GenServer

  require Logger
  alias Jellyfish.Notifier

  alias Videoroom.Meeting
  alias Videoroom.RoomRegistry

  @spec start_link(any) :: GenServer.on_start()
  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @spec add_peer(Meeting.name()) :: {:ok, Jellyfish.Room.peer_token()} | {:error, binary()}
  def add_peer(meeting_name) do
    GenServer.call(__MODULE__, {:add_peer, meeting_name})
  end

  @impl true
  def init(_init_arg) do
    {:ok, supervisor} = DynamicSupervisor.start_link([])
    {:ok, notifier} = Notifier.start_link()
    Notifier.subscribe_server_notifications(notifier)
    Logger.info("Successfully connected")
    Process.monitor(notifier)
    {:ok, %{supervisor: supervisor, notifier: notifier}}
  end

  @impl true
  def handle_call({:add_peer, room_name}, _from, state) do
    DynamicSupervisor.start_child(state.supervisor, {Videoroom.Meeting, room_name})

    {:reply, Meeting.add_peer(room_name), state}
  end

  @impl true
  def handle_info({:jellyfish, %{room_id: room_id} = notification}, state) do
    with {:ok, room_name} <- RoomRegistry.lookup_room(room_id),
         [{pid, _value}] <- Registry.lookup(Videoroom.Registry, room_name) do
      send(pid, {:jellyfish, notification})
    else
      _error ->
        handle_unexpected_notification(notification)
    end

    {:noreply, state}
  end

  @impl true
  def handle_info({:DOWN, _ref, :process, _object, _reason}, state) do
    Logger.warning("Jellyfish Notifier exited")
    {:noreply, state}
  end

  defp handle_unexpected_notification(%Jellyfish.Notification.RoomDeleted{}), do: :ok

  defp handle_unexpected_notification(notification) do
    Logger.warning(
      "Received notification #{inspect(notification)} which doesn't have a corresponding meeting"
    )
  end
end
