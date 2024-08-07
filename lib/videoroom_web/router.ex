defmodule VideoroomWeb.Router do
  use VideoroomWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", VideoroomWeb do
    pipe_through :api

    get "/room/:room_name", RoomController, :show
    get "/room/:room_name/exist", RoomController, :room_exists
    post "/room/:room_name/start_recording", RoomController, :start_recording
  end

  # Enable LiveDashboard in development
  if Application.compile_env(:videoroom, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      live_dashboard "/dashboard", metrics: VideoroomWeb.Telemetry
    end
  end
end
