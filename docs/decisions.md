# Decisions

## ADR-001: BullMQ + Redis for Webhook Delivery
**Date:** 2026-08-29  
**Status:** Accepted

**Context:**  
Webhooks frequently fail due to downstream issues. A naive `fetch()` call drops data if the receiver is down. We need a durable queue with exponential backoff.

**Decision:**  
We replaced the in-memory/SQLite emulation with BullMQ backed by a real Redis instance. BullMQ natively supports delayed retries, rate limiting, and durable queues.

**Consequences:**  
- ✅ Bulletproof delivery guarantees.
- ✅ Exponential backoff out-of-the-box.
- ⚠️ Adds Redis as a hard dependency.

## ADR-002: Progressive Credential Loading (PCL) Architecture
- **Context:** Production hardening required live backends (PostgreSQL, Redis, OpenAI, Anthropic), but removing mocks would break CI pipelines and create high developer onboarding friction.
- **Decision:** Implement Progressive Credential Loading. Keep in-memory and local mock heuristics as the default safe baseline, while wrapping external integrations in auto-promoting factory adapters triggered by environment variables.
- **Consequences:** 
  - *Pros:* 100% CI pass rate without requiring external secrets; zero setup friction for new contributors; progressive upgrade to production clusters.
  - *Cons:* Adds lightweight factory abstraction layers and runtime credential detection logic.
