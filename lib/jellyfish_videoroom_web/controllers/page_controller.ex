defmodule VideoroomWeb.PageController do
  use VideoroomWeb, :controller

  @spec index(Plug.Conn.t(), any) :: Plug.Conn.t()
  def index(conn, _params) do
    render(conn, :index, layout: false)
  end
end
