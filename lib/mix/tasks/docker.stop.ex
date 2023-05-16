defmodule Mix.Tasks.Docker.Stop do
  @moduledoc """
  A task which removes the jellyfish container.
  """
  use Mix.Task

  @container_name "jellyfish"

  @impl Mix.Task
  def run(args) do
    case args do
      [] -> remove()
      _args -> Mix.raise("Invalid arguments, expected: mix docker.stop")
    end
  end

  defp remove() do
    System.cmd("docker", [
      "container",
      "rm",
      "--force",
      @container_name
    ])
  end
end
