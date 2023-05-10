defmodule JellyfishVideoroom.Peer do
  @moduledoc false
  @enforce_keys [:id, :time_created]

  defstruct @enforce_keys

  @type t :: %__MODULE__{
          id: binary(),
          time_created: Time.t()
        }
end
