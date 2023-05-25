defmodule Videoroom.RoomRegistry do
  @moduledoc false
  @table_name :room_table

  @spec lookup(binary()) :: list({binary(), binary()})
  def lookup(name) do
    ensure_exists()

    :ets.lookup(@table_name, name)
  end

  @spec insert_new(binary(), binary()) :: boolean()
  def insert_new(name, room_id) do
    ensure_exists()

    :ets.insert_new(@table_name, {name, room_id})
  end

  defp ensure_exists() do
    case :ets.whereis(@table_name) do
      :undefined ->
        :ets.new(@table_name, [:named_table, :set])

      _ref ->
        :ok
    end
  end
end
