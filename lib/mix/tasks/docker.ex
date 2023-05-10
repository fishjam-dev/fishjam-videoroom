defmodule Mix.Tasks.Docker do
  use Mix.Task

  @turn_port_range "50000-50100"
  # @image "ghcr.io/jellyfish-dev/jellyfish:latest"
  @image "jellyfish-0.1.0"

  @impl Mix.Task
  def run(args) do
    command = List.first(args)

    case command do
      "start" ->
        stop()
        update()
        start()
        Process.sleep(1000)

      "stop" ->
        stop()
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
      ".env-test",
      "--name",
      "jellyfish",
      @image
    ])
  end

  defp stop() do
    System.cmd("docker", [
      "kill",
      "jellyfish"
    ])

    System.cmd("docker", [
      "container",
      "rm",
      "jellyfish"
    ])
  end
end
