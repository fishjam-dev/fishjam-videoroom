defmodule Videoroom.RoomRegistry do
  @moduledoc false

  alias Videoroom.Meeting

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

  @spec lookup(Meeting.name()) :: {:ok, t()} | {:error, :unregistered}
  def lookup(name) do
    case :ets.lookup(@room_table, name) do
      [] ->
        {:error, :unregistered}

      [{^name, table}] ->
        {:ok, table}
    end
  end

  @spec insert_new(Meeting.name(), t()) :: boolean()
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

  @spec delete(Meeting.name()) :: true
  def delete(name) do
    :ets.delete(@room_table, name)
  end
end
