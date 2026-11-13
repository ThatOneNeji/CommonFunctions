# CLAUDE.md

Personal starter toolkit: when the author creates a new JS repo, this is pulled in instead of rewriting the same plumbing. It provides:

- **Logging** — a ready-configured `log4js` logger (`Logger`).
- **RabbitMQ** — connect, consume and publish with minimal setup (`MessageBroker`).
- **Regex patterns and small utilities** — patterns and helpers used more or less often (`NejiUtils`, `RegexPatterns`).

## Distribution (decided 2026-11-13)

Distributed **from GitHub only, not published to npm** (author's choice; revisit only if the git-dependency friction becomes a problem — a scoped `@thatoneneji/…` npm package is the fallback). Consumers:

- add `.npmrc` with `allow-git=root` (newer npm restricts git dependencies; `root` allows ones listed directly in the consumer's `package.json`)
- depend on `github:ThatOneNeji/CommonFunctions#semver:^X.Y.Z`, which resolves against `vX.Y.Z` git tags

So releases = bump `package.json` + `index.js` `@version`, commit, `git tag vX.Y.Z`, push tags. README documents this.

**Any behaviour change here can break consumers** — call it out when making one. Favour simple, drop-in APIs with sensible defaults over configurability.

## Layout

| File | Exported from `index.js` | Depends on |
| --- | --- | --- |
| `lib/logger.js` — `Logger` | yes | `log4js` |
| `lib/messagebroker.js` — `MessageBroker` | yes | `amqp-connection-manager` (+ `amqplib` peer), `moment` |
| `lib/nejiutils.js` — `NejiUtils` | yes | `netmask`, `moment`, `node:crypto`, `node:fs`, `RegexPatterns` |
| `lib/regexpatterns.js` — `RegexPatterns` | yes | — |

## Commands

- `npm test` — runs `node --test "test/**/*.test.js"` (Node built-in test runner, no extra deps). The integration suite is included but skipped unless `AMQP_HOST` is set.
- `npm run test:integration` — real-broker tests: `AMQP_HOST=… AMQP_USER=… AMQP_PASSWORD=… [AMQP_PORT=5672] npm run test:integration`. Dev broker: `rabbitmq03.bwcsystem.local` (throwaway dev system; ask the user for credentials, never commit them). That user has no management-API access.
- `npm run lint` — ESLint over `lib/*.js` (Google style, 4-space indent)
- `npm run documentation` — JSDoc

## Conventions and gotchas

- CommonJS, `'use strict'`, classes with JSDoc on every method.
- Regex patterns live in `RegexPatterns` as **static getters returning plain strings** (no `/.../g` delimiters); add new ones there and to `RegexPatterns.patternNames`. `NejiUtils` re-exposes them via pass-through getters for backward compatibility. Inside instance methods read them as `NejiUtils.X` / `RegexPatterns.X`, never `this.X` (that is `undefined` and silently becomes a match-everything regex).
- `MessageBroker` uses module-level `self`, `Logging` and `Connection` variables, so all instances share state. `init()` calls `process.exit(1)` if `credentials` is missing.
- `Logger` calls `log4js.configure` on every construction (global). Pass `logFile` in tests so nothing is written to `logs/` in the repo.
- Tests pin `process.env.TZ = 'UTC'` before loading `moment`.
- `MessageBroker#close()` must be called when done (tests rely on it so the process exits).
- `test/messagebroker.test.js` injects a fake `amqp-connection-manager` into `require.cache` before requiring the module — no broker needed.

## Work log

### Done (2026-11-13, committed on `develop` as 1.9.5)

Goal: a test suite that catches regressions when dependencies are bumped (this branch moves `amqplib` 0.10 → 2.x, ESLint 9 → 10, and minor bumps of the rest).

Bug fixes:

- `NejiUtils`: instance methods read static patterns via `this` (always matched) → now `NejiUtils.X`; removed literal `/.../g` from ping/date/timer pattern strings; `validateTargetAddress` used non-existent `Netmask#entries()` → `forEach`; `buildHash` used `Object.hasOwn.call` (hashed everything as `''`) and crashed on `null`; `buildRandomString` referenced undefined `characters`; `mysqlTruncColumn` sliced from 1; `mysqlEscape` emitted raw control chars instead of `\n \r \0 \Z`; `buildRTime` returns input when no rule matches; removed debug `console.log`s.
- `isValidHost` now rejects `null`/`undefined` and names with an all-numeric last label (e.g. `1.2.3.999`).
- `MessageBroker`: added `close()`; `Logging.warning` → `warn`; `postMessageToQueue` error path referenced undefined `channelWrapper`/`connection` (now just logs and resolves `false`) and now returns its promise.
- `Logger`: new optional `logFile` option (default `logs/server.log`); the documented `level` option is now honoured (was always `debug`).
- Moved all pattern getters from `NejiUtils` into `RegexPatterns` (+ `patternNames`) and exported `RegexPatterns` from `index.js`.
- README rewritten: install (`.npmrc` + `#semver:`), usage for each class, release steps, dev commands.

Tests added (94 unit + 6 integration, all passing; lint clean):

- `test/nejiutils.test.js` — validation, netmask, moment, crypto/fs, ping patterns, formatting
- `test/logger.test.js` — owner formatting, areas, duplicates, config accepted by log4js, Express middleware, real file write to a temp dir
- `test/messagebroker.test.js` — URL building, init options, missing credentials, connection events, consumer setup, ack/handover, single + batch publish, publish failure, `createPublishQueue`
- `test/messagebroker.integration.test.js` — real RabbitMQ (verified passing against `rabbitmq03` with amqplib 2.3.1 + amqp-connection-manager 5.0.1): raw amqplib connect/assert/send/get/ack/delete, bad credentials rejected, `MessageBroker` init → consume, single + batch (50) publish round trip, persistent delivery, acked messages leave the queue. Uses unique `cf_*` queue names and deletes them afterwards.
- `test/regexpatterns.test.js`, `test/index.test.js` — patterns, exports, no console side effects, every dependency resolves

Consumer-visible behaviour changes in 1.9.5 (shipped as a patch-level bump by choice — mention in release notes): pattern strings lost `/.../g`; `isValidHost` stricter; `mysqlTruncColumn` / `mysqlEscape` output differs; publish failure no longer closes the connection.

### Still to do

- [x] RabbitMQ integration test — `test/messagebroker.integration.test.js`, passing against the dev broker.
- [ ] Integration test does not cover reconnect after a broker restart / connection drop.
- [x] Removed unused `cron` dependency (package.json + lockfile synced).
- [x] Export `RegexPatterns` from `index.js` (patterns consolidated there).
- [ ] `batchPublish` empties the caller's array (pinned by a test as current behaviour) — decide whether to copy instead.
- [ ] `onMessage` throws if `externalHandover` was not supplied; messages rejected by the handover are never nacked.
- [ ] `defaultValue` treats `0`, `''`, `false` as missing (pinned by a test) — confirm intended.
- [ ] `MessageBroker` module-level shared state prevents multiple independent instances.
- [ ] Consider making the `Logger` console appender optional (tests are noisy).
- [ ] Add a CI workflow running `npm test` and `npm run lint`.
- [ ] `npm audit`: high-severity advisories in `markdown-it` / `linkify-it` (via jsdoc, dev-only) and moderate in `minimatch` (via eslint, dev-only). `npm audit fix` resolves most; re-run `npm run documentation` and `npm run lint` after.
- [x] Logger honours `level`.
- [ ] No git tags exist yet — first release tag needed before consumers can use `#semver:` ranges.
- [x] Committed on `develop` as **1.9.5** (author's choice: 2.0.0 is reserved for a planned major refactor tracked elsewhere). Not tagged yet.
- [ ] Tag `v1.9.5` and push tags when ready.
