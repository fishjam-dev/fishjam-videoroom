# Videoroom

Videoroom is an open-source, basic video conferencing platform using WebRTC.
It is based on [jellyfish](https://github.com/jellyfish-dev/jellyfish), a general-purpose media server.
Videoroom may be a good starting point for building your own real-time communication solution using Elixir and Jellyfish.

## Running jellfish videoroom

The simplest way to run videoroom is with use of docker, but first we need to set environment variables. Commands below will setup all needed environment variables for local running of videoroom.

```bash
cp .env.example .env
[ ! -f .env ] || export $(grep -v '^#' .env | xargs)
export EXTERNAL_IP=127.0.0.1 #this will works only on local development
```

After that you can start videoroom with command:
```bash
docker compose up
```

## Installation

Make sure to have installed [Elixir](https://elixir-lang.org/install.html) and [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) first.

Running the Videoroom requires connecting to an instance of [Jellyfish Server](https://github.com/jellyfish-dev/jellyfish).

When running locally, you can start an instance of Jellyfish inside docker using docker compose.

```sh
EXTERNAL_IP=<your ip in local network> docker compose -f docker-compose-dev.yaml up
```

Now you can start the Videoroom backend:
- Run `mix setup` to install and setup dependencies
- Start Phoenix server with `mix phx.server`

When running the build version of the Phoenix app, you must specify the addresses of the Jellyfish and backend service.
As well as the authentication token via the environment variables:

```sh
BE_JF_ADDRESSES=<IP_ADDRESS1>:<PORT1> OR <DOMAIN1> <IP_ADDRESS2>:<PORT2> OR <DOMAIN2> #Example of using two jellyfishes: `127.0.0.1:5002 jellyroom.membrane.ovh`
BE_HOST=<IP_ADDRESS>:<PORT> OR <DOMAIN> 
BE_JF_SERVER_API_TOKEN=<TOKEN> #This must be the same token that was setup in jellyfish. In `docker-compose-dev.yaml` we setup `development`.
```

Optionally, in production, these variables can be set: 
* `BE_PEER_JOIN_TIMEOUT` - can be used to limit the period in which a new peer must join the meeting,
* `BE_JF_SECURE_CONNECTION` - enforces connecting the backend to jellyfish through `wss` protocol,
* `JF_CHECK_ORIGIN` - define whether jellyfish should check origin of incoming requests

Next you have to start a Videoroom frontend:
- Run `npm ci --prefix=assets` to install and setup dependencies
- Start vite server with `npm run dev --prefix=assets`

Now you have all needed components to use jellyfish videoroom.

## Production

To run the Videoroom in production on one machine you can use the provided Docker compose file and adjust it to your needs.
Example configuration is provided in `docker-compose.yaml` and `.env.example` files.
You can copy the `.env.example` file to `.env` and adjust it to your needs.

## Deployment with load-balancing

`docker-compose.yaml` allows to run a jellyfish videoroom with multiple jellyfishes but all of that runs on the same machine.
For properly using load-balancing two machines will be needed and `docker-compose-deploy.yaml` will be used. 
You can see our deployment workflow  [here](.github/workflows/test_build_and_deploy.yml).
This deployment is pretty simple. 
All containers besides `jellyfish2` are started on node1 and `jellyfish2` is started on node2.
All environment variables used in our deployment are presented below:

```sh
DOMAIN=<FRONTEND_DOMAIN>
JF1_IP=<NODE1_IP> # IP address of first node on which jellyfish will be run
JF2_IP=<NODE2_IP> # IP address of second node on which jellyfish will be run
JF_SERVER_API_TOKEN=<API_TOKEN> #The same API token is used for all jellyfishes
JF1_HOST=<DOMAIN_JELLYFISH1> OR <JF1_IP>:<JELLYFISH1_PORT> # Value passed to jellyfish and returns by it when creating a room on this speicific jellyfish
JF2_HOST=<DOMAIN_JELLYFISH2> OR <JF2_IP>:<JELLYFISH2_PORT>
BE_JF_ADDRESSES=<JF1_HOST> <JF2_HOST> #Used by backend to create a notifier to one of jellyfishes
PROMETHEUS_TARGETS=<JF1_IP>:9568,<JF2_IP>:9568 #Addresses on which prometheus will query for data
BE_HOST=<BACKEND_DOMAIN>
GF_SECURITY_ADMIN_PASSWORD=<GRAFANA_PASSWORD>
GF_SECURITY_ADMIN_USER=<GRAFANA_LOGIN>
BE_JF_SECURE_CONNECTION=true
JF_CHECK_ORIGIN=false
```

## Tests

We use [Divo](https://hexdocs.pm/divo/readme.html) in tests, which is responsible for starting docker containers.

When running locally run tests using `mix test`, which starts Jellyfish in a container.

On CI both Jellyfish and the tests are run inside docker. If needed, e.g. when the tests are failing on the CI, but not locally you can simulate those conditions with `mix integration_test`.

## Copyright and License

Copyright 2020, [Software Mansion](https://swmansion.com/?utm_source=git&utm_medium=readme&utm_campaign=membrane_template_plugin)

[![Software Mansion](https://logo.swmansion.com/logo?color=white&variant=desktop&width=200&tag=membrane-github)](https://swmansion.com/?utm_source=git&utm_medium=readme&utm_campaign=membrane_template_plugin)

Licensed under the [Apache License, Version 2.0](LICENSE)
