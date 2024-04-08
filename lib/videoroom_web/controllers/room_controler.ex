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

  operation(:start_recording,
    summary: "Start recording in a room",
    description: "Starts recording in the specified room",
    parameters: [
      room_name: [in: :path, description: "Room name", type: :string]
    ],
    responses: [
      ok: {"Recording started response", "application/json", Token},
      service_unavailable: {"Error", "application/json", Error}
    ]
  )

  action_fallback VideoroomWeb.FallbackController

  @spec show(Plug.Conn.t(), map) :: Plug.Conn.t()
  def show(conn, %{"room_name" => name}=params) do
    IO.inspect(params)
    case RoomService.add_peer(name) do
      {:ok, token, jellyfish_address} ->
        conn
        |> render("show.json", token: token, jellyfish_address: jellyfish_address)

      {:error, reason} ->
        conn |> resp(503, inspect(reason))
    end
  end

  @spec start_recording(Plug.Conn.t(), map) :: Plug.Conn.t()
  def start_recording(conn, %{"room_name" => name}=params) do
    IO.inspect(params)
    case RoomService.start_recording(name) do
      {:ok, _component} -> resp(conn, 200, "Recording started")
      error -> resp(conn, 503, inspect(error))
    end
  end
end
