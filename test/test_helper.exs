if Mix.env() != :integration_test do
  Divo.Suite.start(services: [:jellyfish])
end

ExUnit.start(capture_log: true)
