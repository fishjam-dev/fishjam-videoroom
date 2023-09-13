# Videoroom

Videoroom is an open-source, basic video conferencing platform using WebRTC.
It is based on [jellyfish](https://github.com/jellyfish-dev/jellyfish), a general-purpose media server.
Videoroom may be a good starting point for building your own real-time communication solution using Elixir and Jellyfish.

## Installation

Make sure to have installed [Elixir](https://elixir-lang.org/install.html) first.

Running the Videoroom requires connecting to an instance of [Jellyfish Server](https://github.com/jellyfish-dev/jellyfish).

When running locally, you can start an instance of Jellyfish inside docker using docker compose.

```sh
EXTERNAL_IP=<your ip in local network> docker compose -f docker-compose-dev.yaml up
```

Now you can start the Videoroom:

- Run `mix setup` to install and setup dependencies
- Start Phoenix server with `mix phx.server`

When running the build version of the Phoenix app, you must specify the addresses of the Jellyfish and backend service.
As well as the authentication token via the environment variables:

```sh
JELLYFISH_ADDRESSES=<IP_ADDRESS1>:<PORT1> OR <DOMAIN1> <IP_ADDRESS2>:<PORT2> OR <DOMAIN2> #Example of using two jellyfishes: `127.0.0.1:5002 jellyroom.membrane.ovh`
BACKEND_ADDRESS=<IP_ADDRESS>:<PORT> OR <DOMAIN>
JELLYFISH_API_TOKEN=<TOKEN>
```

Optionally, in production, these variables can be set: 
* `PEER_JOIN_TIMEOUT` - can be used to limit the period in which a new peer must join the meeting,
* `SECURE_CONNECTION` - enforces connecting the backend to jellyfish through `wss` protocol,
* `CHECK_ORIGIN` - define whether jellyfish should check origin of incoming requests

## Production

To run the Videoroom in production on one machine you can use the provided Docker compose file and adjust it to your needs.
Example configuration is provided in `docker-compose.yaml` and `.env.example` files.
You can copy the `.env.example` file to `.env` and adjust it to your needs.

## Deployment with load-balancing

`docker-compose.yaml` allows to run a jellyfish videoroom with multiple jellyfishes but all of that runs on the same machine.
For properly using load-balancing two machines will be needed and `docker-compose-deploy.yaml` will be used. 
You can see our deployment workflow  [here](.github/workflows/test_build_and_deploy.yml).
This deployment is pretty simple all containers besides `jellyfish2` container are started on node1 and `jellyfish2` is started on node2.
All environment variables used in our deployment are presented below:

```sh
DOMAIN=<FRONTEND_DOMAIN>
JELLYFISH1_IP=<NODE1_IP> # IP address of first node on which jellyfish will be run
JELLYFISH2_IP=<NODE2_IP> # IP address of second node on which jellyfish will be run
SERVER_API_TOKEN=<API_TOKEN> #The same API token is used for all jellyfishes
SECRET_KEY_BASE=<SECRET_KEY_BASE>
JELLYFISH1_ADDRESS=<DOMAIN_JELLYFISH1> OR <JELLYFISH1_IP>:<JELLYFISH1_PORT> # Value passed to jellyfish and returns by it when creating a room on this speicific jellyfish
JELLYFISH2_ADDRESS=<DOMAIN_JELLYFISH2> OR <JELLYFISH2_IP>:<JELLYFISH2_PORT>
JELLYFISH_ADDRESSES=<JELLYFISH1_ADDRESS> <JELLYFISH2_ADDRESS> #Used by backend to create a notifier to one of jellyfishes
PROMETHEUS_TARGETS=<JELLYFISH1_IP>:9568,<JELLYFISH2_IP>:9568 #Addresses on which prometheus will query for data
BACKEND_ADDRESS=<BACKEND_DOMAIN>
BEAM_PORT=9000 #Port used by beam for distribution communication 
GF_SECURITY_ADMIN_PASSWORD=<GRAFANA_PASSWORD>
GF_SECURITY_ADMIN_USER=<GRAFANA_LOGIN>
SECURE_CONNECTION=true
CHECK_ORIGIN=false
```

## Tests

We use [Divo](https://hexdocs.pm/divo/readme.html) in tests, which is responsible for starting docker containers.

When running locally run tests using `mix test`, which starts Jellyfish in a container.

On CI both Jellyfish and the tests are run inside docker. If needed, e.g. when the tests are failing on the CI, but not locally you can simulate those conditions with `mix integration_test`.

## Copyright and License

Copyright 2020, [Software Mansion](https://swmansion.com/?utm_source=git&utm_medium=readme&utm_campaign=membrane_template_plugin)

[![Software Mansion](https://logo.swmansion.com/logo?color=white&variant=desktop&width=200&tag=membrane-github)](https://swmansion.com/?utm_source=git&utm_medium=readme&utm_campaign=membrane_template_plugin)

Licensed under the [Apache License, Version 2.0](LICENSE)
