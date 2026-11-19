---
name: Dependency upgrade compatibility
description: Non-obvious export and type-identity constraints encountered during security maintenance.
---

## Preserve the router's query interface

For Expo Router 57, preserve the named CommonJS query-string interface when updating its vulnerable URI decoder.

**Why:** The safe decoder is ESM, while the old query-string consumer expects a callable CommonJS export. Replacing query-string with its latest major is not a drop-in fix either: that version provides a default-only export, whereas this router consumes named parse/stringify functions. A small decoder export bridge was chosen to retain routing behavior instead of changing the query parser's major version.

**How to apply:** Review the tracked patch rationale and run the dependency compatibility tests when changing either package. Remove the bridge only when the router's actual imports support the replacement, and verify both web and native routing.

## Keep React type minors coherent

Keep shared component peers and the Expo app on a coherent React type family; do not hide mismatches with casts or component changes.

**Why:** Mixing React 19.2 and 19.3 type packages produced incompatible ref callback signatures through distinct unique-symbol identities, even though the application runtime had not changed.

**How to apply:** Align compatible type-package ranges and resolutions across the workspace before changing UI code in response to these errors. Preserve the application's existing React and React Native runtime pins.
