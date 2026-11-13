---
name: Testing callback availability
description: Fallback when the documented testing subagent is not provisioned in this runtime.
---

If the testing subagent returns `Unknown config kind: testing`, use the project's direct Playwright checks rather than guessing another subagent kind.

**Why:** The runtime rejected the documented testing configuration even though its skill was available. Local Playwright with the system Chromium successfully exercised the mobile-sized Expo preview.

**How to apply:** Treat the callback result as authoritative. Keep tests in a fresh browser context with synthetic fixtures and distinguish browser checks and native JavaScript compilation from physical-device testing.
