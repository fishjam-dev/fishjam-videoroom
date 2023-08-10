defmodule Videoroom.RoomRegistry do
  @moduledoc false

  alias Videoroom.Meeting

  @room_table :room_table

  @spec create() :: atom()
  def create() do
    :ets.new(@room_table, [:named_table, :set, :public])
  end

  @spec lookup_meeting(Meeting.name()) :: {:ok, Jellyfish.Room.id()} | {:error, :unregistered}
  def lookup_meeting(name), do: lookup(name)

  @spec lookup_room(Jellyfish.Room.id()) :: {:ok, Meeting.name()} | {:error, :unregistered}
  def lookup_room(id), do: lookup(id)

  defp lookup(name_or_id) do
    case :ets.lookup(@room_table, name_or_id) do
      [] ->
        {:error, :unregistered}

      [{^name_or_id, id_or_name}] ->
        {:ok, id_or_name}
    end
  end

  @spec insert_new(Meeting.name(), Jellyfish.Room.id()) :: boolean()
  def insert_new(name, room_id) do
    :ets.insert_new(@room_table, [{name, room_id}, {room_id, name}])
  end

  @spec delete(Meeting.name()) :: true
  def delete(name) do
    case lookup_meeting(name) do
      {:ok, id} ->
        :ets.delete(@room_table, name)
        :ets.delete(@room_table, id)

      _error ->
        true
    end
  end
end
