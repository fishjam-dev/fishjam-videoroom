defmodule JellyfishVideoroomWeb.PageController do
  use JellyfishVideoroomWeb, :controller

  @spec index(Plug.Conn.t(), any) :: Plug.Conn.t()
  def index(conn, _params) do
    render(conn, :index, layout: false)
  end
end
