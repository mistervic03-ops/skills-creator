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
