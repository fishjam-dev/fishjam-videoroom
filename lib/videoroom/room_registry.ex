defmodule Videoroom.RoomRegistry do
  @moduledoc false

  @room_table :room_table

  @spec create() :: atom()
  def create() do
    :ets.new(@room_table, [:named_table, :set, :public])
  end

  @spec lookup(binary()) :: list({binary(), binary()})
  def lookup(name) do
    :ets.lookup(@room_table, name)
  end

  @spec insert_new(binary(), binary()) :: boolean()
  def insert_new(name, room_id) do
    :ets.insert_new(@room_table, {name, room_id})
  end

  @spec delete(binary()) :: true
  def delete(name) do
    :ets.delete(@room_table, name)
  end
end
