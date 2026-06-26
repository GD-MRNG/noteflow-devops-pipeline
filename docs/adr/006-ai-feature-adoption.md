# ADR 006 — AI Summarisation Feature Adoption

**Status:** Proposed  
**Phase:** 12

---

## Context

Phase 12 adds an AI-powered summarisation endpoint to the existing note editor. A user can request a plain-language summary of a note's content; the result is returned inline and not persisted unless the user explicitly replaces the note with it.

This is the first external AI API dependency in the codebase. Several decisions follow from that: which provider to call, how to handle API unavailability without degrading the core app, and how to roll the feature out safely without gating it on a full production deploy.

---

## Decisions

### 1. LLM provider

**Decision:** Use a single provider initially (OpenAI), with the integration point abstracted behind a thin service layer so the provider can be swapped without touching the endpoint handler.

**Rationale:** Multiple LLM providers (OpenAI, Anthropic Claude, Google Gemini) offer equivalent summarisation capability for this use case. Abstracting the call behind a `summarise(text: string): Promise<string>` interface means provider selection becomes a configuration decision, not a code change. This avoids lock-in and allows evaluation of alternatives (latency, cost, output quality) without a refactor.

**Trade-off:** The thin abstraction adds a small indirection layer. For a single provider this feels like over-engineering; the payoff is that switching providers or running A/B comparisons in future requires only a config change and a new adapter.

---

### 2. Reliability pattern for the external API call

**Decision:** Hard 5-second timeout on the LLM API call; no retry; 504 response on timeout. Feature degrades gracefully — the core note editor remains fully functional if the AI endpoint is unavailable or slow.

**Rationale:** LLM API calls are slower and less predictable than internal database queries. Without a timeout, a hung upstream call holds a server-side connection indefinitely. A 5-second ceiling matches the expected p99 latency for a short summarisation request while protecting the app from tail-latency spikes.

Retries are deliberately excluded: LLM requests are not idempotent and a retry under load amplifies upstream pressure. If the first attempt times out, the correct response is a clear user-facing error ("Summary unavailable — try again"), not a silent retry that delays the response further.

A circuit breaker is deferred to Phase 12 completion — the timeout provides sufficient protection for initial rollout at low volume.

---

### 3. Deployment and release decoupling

**Decision:** The feature is deployed behind an environment variable flag (`AI_SUMMARISE_ENABLED`). The UI button and the API endpoint are both gated on this flag. The feature can be enabled in staging without enabling it in production, and vice versa, with no code change.

**Rationale:** This demonstrates the deployment/release decoupling pattern — the binary is the same in both environments; the flag controls visibility. It allows:
- Validating the LLM API integration in staging before it is user-visible in production
- Rolling back to a disabled state without a redeploy (change the flag value in Doppler, restart the app)
- Keeping the endpoint code present in production but inactive until deliberately enabled

**Trade-off:** Feature flags add operational surface area — a flag that is never cleaned up becomes debt. The convention here is that `AI_SUMMARISE_ENABLED` is a launch flag, not a permanent toggle. Once the feature is stable in production it should be hardcoded on and the flag removed.

---

### 4. Secrets management

**Decision:** `OPENAI_API_KEY` (or equivalent for the chosen provider) is stored in Doppler alongside existing app secrets. No new secrets infrastructure is needed.

**Rationale:** The existing Doppler → Fly.io sync handles this transparently. The pipeline already demonstrates this pattern — a new secret requires no workflow changes, only a Doppler config entry. This is intentional: it validates that the secrets management layer generalises to new external dependencies without special-casing.

---

### 5. Observability

**Decision:** Three metrics added for the summarise endpoint: request counter (by status code), response time histogram, and error counter (by error type: timeout, provider error, flag disabled). These are emitted via the existing `prom-client` setup and appear in the same Prometheus/Grafana stack.

**Rationale:** An LLM API call has a different latency profile from a database query. Making it visible in the existing observability stack — rather than relying on provider-side dashboards — means error rate and latency are tracked in context alongside the rest of the application's health signals. This is the same observability-first principle applied to the new dependency.

---

## Consequences

- The core app's availability is not coupled to AI API availability
- Provider can be swapped (OpenAI → Claude → Gemini) by changing configuration and the service adapter; no handler code changes
- Feature rollout is controlled independently of deployment
- Operational cost is a new external API dependency with per-request billing; volume is low at current scale and the tradeoff is accepted
