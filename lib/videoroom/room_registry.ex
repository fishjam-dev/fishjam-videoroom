defmodule Videoroom.RoomRegistry do
  @moduledoc false

  alias Videorom.Meeting

  @enforce_keys [:room_id, :peer_timers]

  defstruct @enforce_keys

  @type t :: %__MODULE__{
          room_id: Jellyfish.Room.id(),
          peer_timers: %{Jellyfish.Peer.id() => reference()}
        }

  @room_table :room_table

  @spec create() :: atom()
  def create() do
    :ets.new(@room_table, [:named_table, :set, :public])
  end

  @spec lookup(Meeting.name()) :: {:ok, Jellyfish.Room.id()} | {:error, :unregistered}
  def lookup(name) do
    case :ets.lookup(@room_table, name) do
      [] ->
        {:error, :unregistered}

      [{^name, id}] ->
        {:ok, id}
    end
  end

  @spec insert_new(Meeting.name(), Jellyfish.Room.id()) :: boolean()
  def insert_new(name, room_id) do
    :ets.insert_new(
      @room_table,
      {name,
       %__MODULE__{
         room_id: room_id,
         peer_timers: %{}
       }}
    )
  end

  @spec put_peer(Meeting.name(), Jellyfish.Peer.id(), reference()) :: true
  def put_peer(name, peer_id, value) do
    {:ok, table} = lookup(name)

    peer_timers = Map.put(table.peer_timers, peer_id, value)
    :ets.insert(@room_table, {name, %{table | peer_timers: peer_timers}})
    peer_timers
  end

  @spec get_and_update_peer(Meeting.name(), Jellyfish.Peer.id(), function()) ::
          {reference(), map()}
  def get_and_update_peer(name, peer_id, fun) do
    {:ok, table} = lookup(name)

    {timer, peer_timers} = Map.get_and_update(table.peer_timers, peer_id, fun)
    :ets.insert(@room_table, {name, %{table | peer_timers: peer_timers}})
    {timer, peer_timers}
  end

  @spec delete_peer(Meeting.name(), Jellyfish.Room.id()) :: map()
  def delete_peer(name, peer_id) do
    {:ok, table} = lookup(name)

    peer_timers = Map.delete(table.peer_timers, peer_id)
    :ets.insert(@room_table, {name, %{table | peer_timers: peer_timers}})
    peer_timers
  end

  @spec delete(Meeting.name()) :: true
  def delete(name) do
    :ets.delete(@room_table, name)
  end
end
