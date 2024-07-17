# Videoroom

This project is archieved and ongoing development was moved to organization [fishjam-cloud](https://github.com/fishjam-cloud/fishjam-videoroom)

Videoroom is an open-source, basic video conferencing platform using WebRTC.
It is based on [fishjam](https://github.com/fishjam-dev/fishjam), a general-purpose media server.
Videoroom may be a good starting point for building your own real-time communication solution using Elixir and Fishjam.

## Running with Docker
The simplest way to run videoroom is with use of Docker.
To do so, modify `.env.example` file by setting the `EXTERNAL_IP` to your private IP address (this can't be loopback!) and type:
```bash
docker compose --env-file .env.example up
```

## Running from source

Make sure to have installed [Elixir](https://elixir-lang.org/install.html) and [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) first.

Running the Videoroom requires connecting to an instance of [Fishjam Server](https://github.com/fishjam-dev/fishjam).

When running locally, you can start an instance of Fishjam inside docker using docker compose.

```sh
EXTERNAL_IP=<your ip in local network> docker compose -f docker-compose-dev.yaml up
```

Now you can start the Videoroom backend:
- Run `mix setup` to install and setup dependencies
- Start Phoenix server with `mix phx.server`

When running the build version of the Phoenix app, you must specify the addresses of the Fishjam and backend service.
As well as the authentication token via the environment variables:

```sh
BE_JF_ADDRESS=<IP_ADDRESS>:<PORT1> OR <DOMAIN1> #Example `127.0.0.1:5002 OR room.fishjam.ovh`, if not provided in dev environment `localhost:5002` is used.
BE_JF_SERVER_API_TOKEN=<TOKEN> #This must be the same token that was setup in fishjam. In `docker-compose-dev.yaml` we setup `development` and this variable is used by default in `dev` environment
```

Optionally, in production, these variables can be set:
* `BE_PEER_JOIN_TIMEOUT` - can be used to limit the period in which a new peer must join the meeting,
* `BE_JF_SECURE_CONNECTION` - enforces connecting the backend to fishjam through `wss` protocol,
* `BE_HOST` - address of backend
* `JF_CHECK_ORIGIN` - define whether fishjam should check origin of incoming requests


Next you have to start a Videoroom frontend:
- Run `npm ci --prefix=assets` to install and setup dependencies
- Start vite server with `npm run dev --prefix=assets`

Now you have all needed components to use fishjam videoroom.

## Production

To run the Videoroom in production on one machine you can use the provided Docker compose file and adjust it to your needs.
Example configuration is provided in `docker-compose.yaml` and `.env.example` files.
You can copy the `.env.example` file to `.env` and adjust it to your needs.

## Deployment with load-balancing

`docker-compose.yaml` allows to run a fishjam videoroom with multiple fishjams but all of that runs on the same machine.
For properly using load-balancing two machines will be needed and `docker-compose-deploy.yaml` will be used.
You can see our deployment workflow  [here](.github/workflows/test_build_and_deploy.yml).
This deployment is pretty simple.
All containers besides `fishjam2` are started on node1 and `fishjam2` is started on node2.
All environment variables used in our deployment are presented below:

```sh
DOMAIN=<FRONTEND_DOMAIN>
JF_SERVER_API_TOKEN=<API_TOKEN> #The same API token is used for all fishjams
BE_JF_ADDRESS=<DOMAIN_FISHJAM1> OR <FISHJAM_IP>:<FISHJAM_PORT>  #Used by backend to create a notifier and to communicate with fishjam
PROMETHEUS_TARGETS=<FISHJAM_IP>:9568 #Addresses on which prometheus will query for data
BE_HOST=<BACKEND_DOMAIN>
GF_SECURITY_ADMIN_PASSWORD=<GRAFANA_PASSWORD>
GF_SECURITY_ADMIN_USER=<GRAFANA_LOGIN>
BE_JF_SECURE_CONNECTION=true
JF_CHECK_ORIGIN=false
```

## Tests

We use [Divo](https://hexdocs.pm/divo/readme.html) in tests, which is responsible for starting docker containers.

When running locally run tests using `mix test`, which starts Fishjam in a container.

On CI both Fishjam and the tests are run inside docker. If needed, e.g. when the tests are failing on the CI, but not locally you can simulate those conditions with `mix integration_test`.

## Copyright and License

Copyright 2020, [Software Mansion](https://swmansion.com/?utm_source=git&utm_medium=readme&utm_campaign=membrane_template_plugin)

[![Software Mansion](https://logo.swmansion.com/logo?color=white&variant=desktop&width=200&tag=membrane-github)](https://swmansion.com/?utm_source=git&utm_medium=readme&utm_campaign=membrane_template_plugin)

Licensed under the [Apache License, Version 2.0](LICENSE)
