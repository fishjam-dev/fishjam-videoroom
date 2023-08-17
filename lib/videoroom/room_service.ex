defmodule Videoroom.RoomService do
  @moduledoc false
  use GenServer

  require Logger
  alias Jellyfish.Notifier

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

  @impl true
  def init(_init_arg) do
    {:ok, supervisor} = DynamicSupervisor.start_link([])

    notifiers =
      :videoroom
      |> Application.fetch_env!(:jellyfish_addresses)
      |> Enum.map(fn jellyfish_address ->
        {:ok, notifier} = Notifier.start_link(server_address: jellyfish_address)
        Logger.info("Successfully connected to #{jellyfish_address}")
        Notifier.subscribe_server_notifications(notifier)
        {jellyfish_address, notifier}
      end)
      |> IO.inspect(label: :notifiers)
      |> Map.new()

    {:ok, %{supervisor: supervisor, notifiers: notifiers}}
  end

  @impl true
  def handle_call({:add_peer, room_name}, _from, state) do
    IO.inspect(state.notifiers, label: :notifiers)

    [jellyfish_address | _] = Map.keys(state.notifiers)

    IO.inspect(jellyfish_address, label: :jellyfish_address)

    case DynamicSupervisor.start_child(
           state.supervisor,
           {Videoroom.Meeting, %{name: room_name, jellyfish_address: jellyfish_address}}
         ) do
      {:error, {:already_started, _}} ->
        nil

      {:error, error} ->
        Logger.error("During spawning child error occurs: #{inspect(error)}")

      _other ->
        nil
    end

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

  defp handle_unexpected_notification(%Jellyfish.Notification.RoomDeleted{}), do: :ok

  defp handle_unexpected_notification(notification) do
    Logger.warning(
      "Received notification #{inspect(notification)} which doesn't have a corresponding meeting"
    )
  end
end
