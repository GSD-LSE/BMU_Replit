---
name: React type family alignment
description: Keep shared TypeScript component peers compatible with the Expo app's React type family.
---

## Keep React type minors coherent

Keep shared component peers and the Expo app on a coherent React type family; do not hide mismatches with casts or component changes.

**Why:** Mixing React type minors produced incompatible ref callback signatures through distinct unique-symbol identities, even when runtime versions remained compatible.

**How to apply:** Align compatible type-package ranges and resolutions across the workspace before changing UI code in response to ref errors. Preserve the runtime versions selected for each app's supported Expo SDK.
