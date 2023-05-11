defmodule Mix.Tasks.Docker.Start do
  @moduledoc """
  A task for starting Jellyfish in docker,
  e.g. for local development or testing.
  """
  use Mix.Task

  @turn_port_range "50000-50100"
  # @image "ghcr.io/jellyfish-dev/jellyfish:latest"
  @image "jellyfish-0.1.0"
  @container_name "jellyfish"

  @impl Mix.Task
  def run(args) do
    case args do
      [] -> general()
      _ -> Mix.raise("Invalid arguments, expected: mix docker.start")
    end
  end

  defp general() do
    ensure_stopped()
    update()
    start()
  end

  defp ensure_stopped() do
    {result, 0} =
      System.cmd(
        "docker",
        [
          "container",
          "ls",
          "--all",
          "-f",
          "name=^#{@container_name}$",
          "--quiet"
        ]
      )

    unless String.trim(result) == "" do
      IO.puts("""
      The \"#{@container_name}\" container is already existing,
      remove it first with `mix docker.stop`
      """)

      exit(:normal)
    end
  end

  defp update() do
    System.cmd("docker", [
      "pull",
      @image
    ])
  end

  defp start() do
    System.cmd("docker", [
      "run",
      "-d",
      "-p",
      "#{@turn_port_range}:#{@turn_port_range}/udp",
      "-p",
      "4000:4000/tcp",
      "--env-file",
      ".jellyfish-test-env",
      "--name",
      @container_name,
      @image
    ])
  end
end
