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
