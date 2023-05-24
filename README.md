# Videoroom

Videoroom is an open-source, basic video conferencing platform using WebRTC.
It is based on [jellyfish](https://github.com/jellyfish-dev/jellyfish), a general-purpose media server. 
Videoroom may be a good starting point for building your own real-time communication solution using Elixir and Jellyfish.

## Installation 

Make sure to have installed [Elixir](https://elixir-lang.org/install.html) first.

Running the Videoroom requires connecting to an instance of [Jellyfish Server](https://github.com/jellyfish-dev/jellyfish).

When running locally, you can start an instance of Jellyfish inside docker using docker compose.
```
INTEGRATED_TURN_IP=<your ip in local network> docker compose -f docker-compose-dev.yaml up
```

Now you can start the Videoroom:
  * Run `mix setup` to install and setup dependencies
  * Start Phoenix server with `mix phx.server`

## Usage

TODO

## Tests

We use [Divo](https://hexdocs.pm/divo/readme.html) in tests, which is responsible for starting docker containers.

When running locally run tests using `mix test`, which starts Jellyfish in a container.

On CI both Jellyfish and the tests are run inside docker. If needed, e.g. when the tests are failing on the CI, but not locally you can simulate those conditions with `mix integration_test`.


## Copyright and License

Copyright 2020, [Software Mansion](https://swmansion.com/?utm_source=git&utm_medium=readme&utm_campaign=membrane_template_plugin)

[![Software Mansion](https://logo.swmansion.com/logo?color=white&variant=desktop&width=200&tag=membrane-github)](https://swmansion.com/?utm_source=git&utm_medium=readme&utm_campaign=membrane_template_plugin)

Licensed under the [Apache License, Version 2.0](LICENSE)
