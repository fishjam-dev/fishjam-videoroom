defmodule Videoroom.Notifier do
  @moduledoc false
  use GenServer

  require Logger

  @max_retries 3

  @spec start_link(Keyword.t()) :: GenServer.on_start()
  def start_link(args) do
    GenServer.start_link(__MODULE__, args)
  end

  @impl true
  def init(opts) do
    {:ok, %{tries: 0}, {:continue, opts}}
  end

  @impl true
  def handle_continue(opts, state) do
    try_connection(opts, state)
  end

  @impl true
  def handle_info({:retry_connection, opts}, state) do
    try_connection(opts, state)
  end

  @impl true
  def handle_info({:DOWN, _ref, :process, _object, _reason}, state) do
    Logger.warning("Jellyfish Notifier exited")
    {:noreply, state}
  end

  defp try_connection(opts, state) do
    try do
      Supervisor.start_link([{Jellyfish.Notifier, opts}], strategy: :one_for_one)
      Logger.info("Successfully connected")
      Process.monitor(Jellyfish.Notifier)
      {:noreply, state}
    rescue
      RuntimeError ->
        if state.retries == @max_retries do
          System.stop(1)
        else
          Process.send_after(self(), {:retry_connection, opts}, 500)

          {:noreply, %{retries: state.retries + 1}}
        end
    end
  end
end
