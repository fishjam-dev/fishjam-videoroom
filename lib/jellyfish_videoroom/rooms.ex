defmodule JellyfishVideoroom.Rooms do
  @moduledoc false
  alias JellyfishVideoroom.Rooms.Room

  @enforce_keys [:id_map, :data]

  defstruct @enforce_keys

  @type t :: %__MODULE__{
          id_map: %{binary() => binary()},
          data: %{binary() => Room.t()}
        }

  @spec new :: JellyfishVideoroom.Rooms.t()
  def new() do
    %__MODULE__{
      id_map: %{},
      data: %{}
    }
  end

  @spec fetch_by_jf_id(t, binary()) :: {:ok, Room.t()} | :error
  def fetch_by_jf_id(rooms, jf_id) do
    Map.fetch(rooms.data, jf_id)
  end

  @spec fetch_by_id(t, binary()) :: {:ok, Room.t()} | :error
  def fetch_by_id(rooms, id) do
    with {:ok, jf_id} <- Map.fetch(rooms.id_map, id) do
      fetch_by_jf_id(rooms, jf_id)
    else
      :error ->
        :error
    end
  end

  @spec put(t, Room.t()) :: t
  def put(rooms, room) do
    %__MODULE__{
      id_map: Map.put(rooms.id_map, room.id, room.jf_id),
      data: Map.put(rooms.data, room.jf_id, room)
    }
  end

  @spec delete(t, Room.t()) :: t
  def delete(rooms, room) do
    %__MODULE__{
      id_map: Map.delete(rooms.id_map, room.id),
      data: Map.delete(rooms.data, room.jf_id)
    }
  end

  @spec add_peer(t, Room.t(), Jellyfish.Peer.t()) :: t
  def add_peer(rooms, room, jf_peer) do
    room = Room.add_peer(room, jf_peer)
    put(rooms, room)
  end

  @spec delete_peer(t, Room.t(), binary()) :: t
  def delete_peer(rooms, room, peer_id) do
    room = Room.delete_peer(room, peer_id)
    put(rooms, room)
  end
end
