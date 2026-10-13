---
name: Expo package maturity cutoff
description: How to recover when the package registry blocks an Expo module released too recently.
---

When an Expo SDK-compatible package is rejected because it was published too recently for the package maturity window, use the most recent compatible mature patch instead of overriding the guard.

**Why:** During a mobile prototype build, a same-day SDK module release was not yet considered mature by the package registry, while the previous patch installed cleanly.

**How to apply:** Check the SDK compatibility and registry message, then pin a mature prior patch if available. If no compatible mature patch exists, find another maintained option or report the blocker.
