defmodule JellyfishVideoroom.Repo do
  use Ecto.Repo,
    otp_app: :jellyfish_videoroom,
    adapter: Ecto.Adapters.Postgres
end
