# Deployment

This deployment is for internal champion testing on the DGX Spark server.

## Target

- Server: Ubuntu Linux on ARM64 / aarch64
- URL: `http://192.168.3.41`
- Runtime: Docker and Docker Compose
- Public service: frontend on port `80`
- Internal service: backend on port `8000` inside the Compose network

## Environment

Create `.env` from the example before starting the stack:

```sh
cp .env.example .env
```

Set the required Anthropic API key:

```sh
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Generated skills are stored on the backend container's local filesystem under
`SKILL_LIBRARY_DIR=/app/data/skills`. An external database is intentionally not
used for V1.

In Docker Compose, `/app/data` is backed by the named volume
`skill-library-data`. Skill files are written under:

```text
/app/data/skills/<skill_id>/skill.md
/app/data/skills/<skill_id>/metadata.json
```

The named volume is local to the Docker host and survives container recreation,
image rebuilds, and ordinary redeploys. Running `docker compose down` removes the
containers and network, but it does not delete `skill-library-data`. Do not use
`docker compose down -v` unless you intentionally want to delete the saved Skill
Library data.

Do not commit `.env` or real API keys.

## Build

```sh
docker compose build
```

## Start

```sh
docker compose up -d
```

Or build and start in one command:

```sh
docker compose up -d --build
```

## Stop

```sh
docker compose down
```

## Restart

```sh
docker compose restart
```

## Logs

```sh
docker compose logs -f
```

Backend only:

```sh
docker compose logs -f backend
```

Frontend only:

```sh
docker compose logs -f frontend
```

## Verify

```sh
docker compose up -d --build
docker compose ps
curl http://localhost
curl http://localhost/api/health
```

From another machine on the internal network:

```sh
curl http://192.168.3.41
curl http://192.168.3.41/api/health
```

The health endpoint should return:

```json
{"status":"ok"}
```

## Update Deployment

Pull the latest code on the DGX Spark server, then rebuild and restart:

```sh
git pull
docker compose up -d --build
docker compose ps
curl http://localhost/api/health
```

Saved skills remain in the `skill-library-data` volume during this rebuild and
restart flow.
