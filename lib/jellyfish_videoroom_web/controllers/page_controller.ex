defmodule JellyfishVideoroomWeb.PageController do
  use JellyfishVideoroomWeb, :controller

  def index(conn, _params) do
    # The home page is often custom made,
    # so skip the default app layout.
    render(conn, :index, layout: false)
  end
end
