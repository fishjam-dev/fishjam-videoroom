defmodule VideoroomWeb.RoomController do
  use VideoroomWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias OpenApiSpex.Schema
  alias Videoroom.ApiSpec.Error
  alias VideoroomWeb.ApiSpec.Token

  alias Videoroom.RoomService

  tags [:room]

  operation(:show,
    summary: "Join a room",
    description: "Create a new peer in a room and get its token",
    operationId: "RoomController.Show",
    parameters: [
      room_name: [
        in: :path,
        description: "Room name",
        type: :string
      ]
    ],
    request_body: {
      "Room params",
      "application/json",
      %Schema{}
    },
    responses: [
      ok: {"Room response", "application/json", Token},
      service_unavailable: {"Error", "application/json", Error}
    ]
  )

  action_fallback VideoroomWeb.FallbackController

  @spec show(Plug.Conn.t(), map) :: Plug.Conn.t()
  def show(conn, %{"id" => name}) do
    case RoomService.add_peer(name) do
      {:ok, token, jellyfish_address} ->
        conn
        |> render("show.json", token: token, jellyfish_address: jellyfish_address)

      {:error, reason} ->
        conn |> resp(503, inspect(reason))
    end
  end
end
