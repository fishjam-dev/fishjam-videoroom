defmodule Videoroom.Notifier do
  @moduledoc false
  use GenServer

  require Logger

  @spec start_link(Keyword.t()) :: GenServer.on_start()
  def start_link(args) do
    GenServer.start_link(__MODULE__, args)
  end

  @impl true
  def init(opts) do
    Supervisor.start_link([{Jellyfish.Notifier, opts}], strategy: :one_for_one)
    Logger.info("Successfully connected")
    Process.monitor(Jellyfish.Notifier)
    {:ok, %{}}
  end
end
