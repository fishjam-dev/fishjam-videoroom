defmodule JellyfishVideoroomWeb.RoomController do
  use JellyfishVideoroomWeb, :controller

  alias JellyfishVideoroom.{JellyfishClient}

  action_fallback JellyfishWeb.FallbackController

  @spec show(Plug.Conn.t(), map) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    {:ok, token} = JellyfishClient.join_room(id)

    conn
    |> put_resp_content_type("application/json")
    |> render("show.json", token: token)
  end
end
