> **NOTE:** This repository is an archival lab or partial prototype. It is not actively maintained and should not be used as a reference for production-grade deployments or performance benchmarks.


# Webhook Delivery System 🪝

> **Maturity:** Functional Prototype
> _Reliable webhook dispatcher with exponential backoff, retry queues, and HMAC signature validation._

## The Problem
## Problem Statement
Downstream third-party servers often fail, leading to silent data loss.

## Architecture & Solution
Instead of Redis, it uses an embedded SQLite-backed state machine to track delivery attempts, ensuring absolute delivery persistence. Simple CRUD applications fail when subjected to high throughput, race conditions, or massive data sets.

## The Solution
This project implements a robust microservice architecture designed to handle these specific edge cases. By utilizing advanced paradigms like idempotency keys, advisory locks, or optimized caching layers, this service guarantees data integrity under load.

```text
┌──────────────┐      ┌───────────────┐      ┌───────────────┐
│              │      │               │      │               │
│   Client     │─────►│   API Layer   │─────►│  Data Store   │
│              │      │               │      │               │
└──────────────┘      └───────────────┘      └───────────────┘
```

## 🛠️ Tech Stack
- **Core Technology**: Node.js, BullMQ, Redis
- **Architecture**: Microservices, Event-Driven

## Decision Log
| Decision | Rationale |
|----------|-----------|
| Monorepo vs Polyrepo | Chosen self-contained repository for easier deployment and PoC demonstration |
| State Management | All state is pushed to the Data Store/Cache to keep the API stateless and horizontally scalable |
| Error Handling | Standardized JSON error responses with explicit error codes |

## 🚀 Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/SumitDalavi/webhook-delivery-system.git
cd webhook-delivery-system

# 2. Build and start
docker-compose up -d --build

# 3. Verify it's running
curl http://localhost:8080/health
```

The API is now available at **http://localhost:8080**

## 🧪 Usage & Demo

```bash
# Health Check
curl http://localhost:8080/health

# Simulate Traffic
curl -X POST http://localhost:8080/api/trigger -H "Content-Type: application/json" -d '{"test":"payload"}'
```

## ✅ Verification

| Check | Command | Expected |
|-------|---------|----------|
| Health | `curl http://localhost:8080/health` | `{"status": "ok"}` |
| Load | `make test` | All unit/integration tests pass |

## 👨‍💻 Author
**Sumit Dalavi** — Senior DevSecOps / Platform Engineer
[GitHub](https://github.com/SumitDalavi) | [LinkedIn](https://in.linkedin.com/in/sumit-dalavi-762838129)

---
*Built with a focus on robust patterns, not toy demos.*


---

## Mock Boundaries (Honest Scope)

| What | Status | Details |
|---|---|---|
| Task Broker | **Real** | Uses BullMQ over a real Redis instance for durable queuing. |
| Dispatcher Worker | **Real** | Executes HTTP calls with exponential backoff. |
| Receiver | **Simulated** | A local express endpoint acts as the webhook sink for tests. |

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) — System diagram and component details
- [Runbook](docs/runbook.md) — Setup, commands, and expected outputs
- [Decisions](docs/decisions.md) — ADRs for message broker selection
- [Changelog](docs/changelog.md) — Change history

## Known Limitations
- **Persistence**: Worker boundaries and persistence are currently simulated in-memory.
