defmodule JellyfishVideoroomWeb.RoomControler do
  @moduledoc false
  use JellyfishVideoroomWeb, :controller

  @spec index(Plug.Conn.t(), map) :: Plug.Conn.t()
  def index(conn, params) do
    render(conn, "index.html",
      room_id: Map.get(params, "room_id"),
      simulcast: Map.get(params, "simulcast"),
      layout: false
    )
  end
end
