if Mix.env() != :integration_test do
  Divo.Suite.start()
end

ExUnit.start(capture_log: true)
