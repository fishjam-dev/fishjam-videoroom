defmodule JellyfishVideoroom.Rooms.Room do
  @moduledoc false
  alias JellyfishVideoroom.Peer

  @enforce_keys [:id, :jf_id, :peers, :peer_timeout]

  defstruct @enforce_keys

  @type t :: %__MODULE__{
          id: binary(),
          jf_id: binary(),
          peers: %{binary() => any()},
          peer_timeout: integer()
        }

  @spec add_peer(t, Jellyfish.Peer.t()) :: t
  def add_peer(room, jf_peer) do
    peer = %Peer{
      id: jf_peer.id,
      time_created: Time.utc_now()
    }

    peers = Map.put(room.peers, peer.id, peer)
    %{room | peers: peers}
  end

  @spec delete_peer(t, binary()) :: t
  def delete_peer(room, id) do
    peers = Map.delete(room.peers, id)
    %{room | peers: peers}
  end
end