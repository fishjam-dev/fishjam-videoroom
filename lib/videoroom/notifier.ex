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
    Process.monitor(Jellyfish.Notifier)

    {:ok, nil}
  end

  @impl true
  def handle_info({:DOWN, _ref, :process, _object, _reason}, state) do
    Logger.warning("Jellyfish Notifier exited")
    {:noreply, state}
  end
end
