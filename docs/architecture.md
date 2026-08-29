# Architecture — webhook-delivery-system
> Last updated: 2026-08-29 | Maturity: Partial Prototype
> _Durable webhook delivery via BullMQ and Redis._

## System Diagram
```mermaid
flowchart TD
    App(["Upstream App"])
    API["API / Enqueuer\n:8080"]
    Redis[("Redis :6379\n(BullMQ)")]
    Worker["Dispatcher Worker"]
    Receiver["Receiver Endpoint"]

    App -->|"POST /webhooks"| API
    API -->|"LPUSH payload"| Redis
    Worker -->|"BRPOP payload"| Redis
    Worker -->|"POST /receive"| Receiver
    Receiver -.->|"200 OK / 500 Error"| Worker
    Worker -->|"Ack / Re-queue"| Redis
```

## Component Table
| Component | File | Responsibility | Tech |
|---|---|---|---|
| API Server | `index.js` | Receives payloads and enqueues jobs | Express.js |
| Worker | `src/worker.js` | Processes queue, handles backoff | BullMQ |
| Broker | `docker-compose.yml` | State persistence | Redis |

## Dependency Honesty Table
| Dependency | Status | Notes |
|---|---|---|
| Redis | **Real** | Used by BullMQ for durable queuing and exponential backoff tracking. |
| Receiver | **Simulated** | A dummy local endpoint is used in tests to simulate failures. |
