if Mix.env() == :dev do
  defmodule Mix.Tasks.Docker.Start do
    @moduledoc """
    A task for starting Jellyfish in docker,
    for use in local development.
    """
    use Mix.Task

    @impl Mix.Task
    def run(args) do
      case args do
        [] -> start()
        _args -> Mix.raise("Invalid arguments, expected: mix docker.start")
      end
    end

    defp start() do
      System.cmd("docker", [
        "compose",
        "-f",
        "docker-compose-dev.yaml",
        "up",
        "-d"
      ])
    end
  end
end
