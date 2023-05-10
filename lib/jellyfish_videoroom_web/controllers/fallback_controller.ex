defmodule JellyfishVideoroomWeb.FallbackController do
  @moduledoc """
  Translates controller action results into valid `Plug.Conn` responses.

  See `Phoenix.Controller.action_fallback/1` for more details.
  """
  use JellyfishVideoroomWeb, :controller

  # This clause handles errors returned by Ecto's insert/update/delete.
  @spec call(Plug.Conn.t(), {:error, any()}) :: Plug.Conn.t()
  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: JellyfishVideoroomWeb.ChangesetJSON)
    |> render(:error, changeset: changeset)
  end

  # This clause is an example of how to handle resources that cannot be found.
  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(html: JellyfishVideoroomWeb.ErrorHTML, json: JellyfishVideoroomWeb.ErrorJSON)
    |> render(:"404")
  end
end
