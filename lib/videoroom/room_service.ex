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

    notifier =
      :videoroom
      |> Application.fetch_env!(:jellyfish_addresses)
      |> Enum.reduce_while(nil, fn jellyfish_address, nil ->
        case Notifier.start_link(server_address: jellyfish_address) do
          {:ok, notifier} ->
            Logger.info("Successfully connected to #{jellyfish_address}")
            Notifier.subscribe_server_notifications(notifier)
            {:halt, {jellyfish_address, notifier}}

          {:error, reason} ->
            Logger.warn("Unable to connect to #{jellyfish_address}, reason: #{inspect(reason)}")
            {:cont, nil}
        end
      end)

    if notifier == nil do
      raise("Unable to connect to any jellyfish")
    end

    {:ok, %{supervisor: supervisor, notifier: notifier}}
  end

  @impl true
  def handle_call({:add_peer, room_name}, _from, state) do
    {jellyfish_address, _pid} = state.notifier

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
