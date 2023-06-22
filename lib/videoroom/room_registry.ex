defmodule Videoroom.RoomRegistry do
  @moduledoc false

  alias Videoroom.Meeting

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
    :ets.insert_new(@room_table, {name, room_id})
  end

  @spec delete(Meeting.name()) :: true
  def delete(name) do
    :ets.delete(@room_table, name)
  end
end
