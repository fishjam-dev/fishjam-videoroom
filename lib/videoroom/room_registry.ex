defmodule Videoroom.RoomRegistry do
  @moduledoc false
  @room_table :room_table

  @spec lookup(binary()) :: list({binary(), binary()})
  def lookup(name) do
    ensure_exists()

    :ets.lookup(@room_table, name)
  end

  @spec insert_new(binary(), binary()) :: boolean()
  def insert_new(name, room_id) do
    ensure_exists()

    :ets.insert_new(@room_table, {name, room_id})
  end

  @spec delete(binary()) :: true
  def delete(name) do
    :ets.delete(@room_table, name)
  end

  defp ensure_exists() do
    case :ets.whereis(@room_table) do
      :undefined ->
        :ets.new(@room_table, [:named_table, :set, :public])

      _ref ->
        :ok
    end
  end
end
