# Dependency compatibility patch

Expo Router 57 imports the named CommonJS API of `query-string` 7. Its original
`decode-uri-component` dependency has denial-of-service advisories; the fixed
decoder (0.5.1) exports an ES module instead of a CommonJS function.

The workspace overrides only that decoder dependency. The patch accepts the
decoder's default export while preserving `query-string`'s existing API and the
router's behavior. It does not replace or weaken the patched decoder.

Do not simply remove the patch or replace `query-string` with its latest major:
the latter provides a default-only export, which does not match this router's
named imports. Remove both the patch and override when upgrading to a router
that natively uses a safe decoder and verify its URL parsing on web and native.

Run `pnpm --filter @workspace/scripts test:dependency-security` to check the
bridge, pattern libraries, schema validation, form resolver, certificate tooling,
proxy handling, and malformed compressed-request handling.
