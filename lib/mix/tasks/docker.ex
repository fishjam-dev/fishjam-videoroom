defmodule Mix.Tasks.Docker do
  use Mix.Task

  @turn_port_range "50000-50100"

  @impl Mix.Task
  def run(args) do
    command = List.first(args)

    case command do
      "start" ->
        stop()
        start()
        Process.sleep(1000)

      "stop" ->
        stop()
        Process.sleep(1000)
    end
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
      "ghcr.io/jellyfish-dev/jellyfish:latest"
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
