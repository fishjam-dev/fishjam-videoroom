defmodule Videoroom.MeetingSupervisor do
  @moduledoc """
  Supervisor for `Videoroom.Meeting`s,
  providing functions for interacting with them.
  """
  use DynamicSupervisor

  alias Videoroom.Meeting

  def start_link(_init_arg) do
    DynamicSupervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(init_arg) do
    DynamicSupervisor.init(init_arg)
  end

  @spec add_peer(binary()) :: {:ok, binary()} | {:error, binary()}
  def add_peer(room_name) do
    # `max_peers` = nil creates a room without limit
    args = [name: room_name, max_peers: nil]

    DynamicSupervisor.start_child(__MODULE__, {Meeting, args})

    Meeting.add_peer(room_name)
  end
end
