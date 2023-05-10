defmodule JellyfishVideoroomWeb.RoomController do
  use JellyfishVideoroomWeb, :controller

  alias JellyfishVideoroom.{JellyfishClient}

  action_fallback JellyfishWeb.FallbackController

  def show(conn, %{"id" => id}) do
    {:ok, token} = JellyfishClient.join_room(id)

    conn
    |> put_resp_content_type("application/json")
    |> render("show.json", token: token)
  end
end
