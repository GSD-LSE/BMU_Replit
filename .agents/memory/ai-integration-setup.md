---
name: AI integration setup availability
description: Managed OpenAI AI integration setup may be unavailable even when the skill documents it.
---

When `setupReplitAIIntegrations` is not registered in CodeExecution and integration search finds no OpenAI connection, the app cannot activate Replit-managed model access in that session. Do not move credentials into the mobile app or assume the service is live; server routes should fail closed and preserve manual/offline capture.

**Why:** The documented setup callback returned `ReferenceError` on three attempts, and integration discovery returned no matching connection.

**How to apply:** Before claiming live model use, confirm server-side AI integration provisioning is active. If it is not, keep the routes gated on server-only AI environment variables and tell the user that live requests need the managed integration enabled.
