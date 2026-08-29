# Runbook — webhook-delivery-system
> Last updated: 2026-08-29

## Quick Start
```bash
docker-compose up -d --build
```
API runs on `http://localhost:8080`.

## Run Tests
```bash
npm test
bash tests/e2e/test_redis_broker.sh
```

## Environment Variables
| Variable | Default | Purpose |
|---|---|---|
| REDIS_URL | `redis://localhost:6379` | Connection string for BullMQ |
| PORT | `8080` | API Port |
