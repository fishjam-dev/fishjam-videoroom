defmodule Videoroom.RoomRegistry do
  @moduledoc false
  use GenServer

  @room_table :room_table

  @spec start_link(any()) :: GenServer.on_start()
  def start_link(_opts) do
    :ets.new(@room_table, [:named_table, :set, :public])
    GenServer.start_link(__MODULE__, [])
  end

  @spec init(any()) :: {:ok, map}
  def init(_args), do: {:ok, %{}}

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
