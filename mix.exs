defmodule Videoroom.MixProject do
  use Mix.Project

  def project do
    [
      app: :videoroom,
      version: "0.1.0",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      dialyzer: dialyzer()
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Videoroom.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(env) when env in [:test, :integration_test], do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:phoenix, "~> 1.7.2"},
      {:phoenix_live_dashboard, "~> 0.7.2"},
      {:telemetry_metrics, "~> 0.6"},
      {:telemetry_poller, "~> 1.0"},
      {:jason, "~> 1.2"},
      {:plug_cowboy, "~> 2.5"},

      # Jellyfish deps
      {:jellyfish_server_sdk, github: "jellyfish-dev/elixir_server_sdk"},

      # Dev
      {:credo, ">= 0.0.0", only: :dev, runtime: false},
      {:dialyxir, ">= 0.0.0", only: :dev, runtime: false},
      {:open_api_spex, "~> 3.16"},
      {:ymlr, "~> 3.0", only: :dev},

      # Test
      {:websockex, "~> 0.4.3"},
      {:divo, "~> 1.3.1", only: [:test, :integration_test]}
    ]
  end

  defp dialyzer() do
    opts = [
      flags: [:error_handling]
    ]

    if System.get_env("CI") == "true" do
      # Store PLTs in cacheable directory for CI
      [plt_local_path: "priv/plts", plt_core_path: "priv/plts"] ++ opts
    else
      opts
    end
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to install project dependencies and perform other setup tasks, run:
  #
  #     $ mix setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: ["deps.get"],
      "api.spec": ["openapi.spec.yaml --spec VideoroomWeb.ApiSpec"],
      integration_test: [
        "cmd docker compose -f docker-compose-integration.yaml pull",
        # We use `run test` instead of `up` command as containers will be cleaned-up
        # when the test service ends, which is not a case when running with `up`.
        "cmd docker compose -f docker-compose-integration.yaml run test"
      ]
    ]
  end
end
