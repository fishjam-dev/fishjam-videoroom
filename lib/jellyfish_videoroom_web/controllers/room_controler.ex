defmodule JellyfishVideoroomWeb.RoomController do
  use JellyfishVideoroomWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias JellyfishVideoroomWeb.ApiSpec.Token
  alias JellyfishVideoroom.JellyfishClient
  alias OpenApiSpex.Schema

  tags [:room]

  operation(:show,
    summary: "Join a room",
    description: "Create a new peer in a room and get its token",
    operationId: "RoomController.Show",
    parameters: [
      room_id: [
        in: :path,
        description: "Room ID",
        type: :string
      ]
    ],
    request_body: {
      "Room params",
      "application/json",
      %Schema{}
    },
    responses: [
      ok: {"Room response", "application/json", Token}
    ]
  )

  action_fallback JellyfishWeb.FallbackController

  @spec show(Plug.Conn.t(), map) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    {:ok, token} = JellyfishClient.join_room(id)

    conn
    |> put_resp_content_type("application/json")
    |> render("show.json", token: token)
  end
end
