# CommonFunctions

A personal starter toolkit for new JavaScript projects: a ready-to-use logger, a RabbitMQ client, and a collection of commonly used regex patterns and helpers.

## Table of Contents

1. [Installing](#installing)
2. [Usage](#usage)
3. [Releasing a new version](#releasing-a-new-version)
4. [Development](#development)
5. [Troubleshooting](#troubleshooting)

## Installing

This package is installed straight from GitHub rather than from the npm registry.

### 1. Allow the git dependency

Newer npm versions limit installing packages from git. Add an `.npmrc` file to the root of the project that uses this package:

```ini
allow-git=root
```

`root` only allows git dependencies that are listed directly in that project's own `package.json`, which is all that is needed here.

### 2. Add the dependency

Pin to a released version range (recommended):

```bash
npm i "github:ThatOneNeji/CommonFunctions#semver:^1.9.0"
```

This resolves against the git tags (`v1.9.0`, `v1.10.0`, …), so you only pick up changes when a new version is tagged. To follow the latest commit on the default branch instead:

```bash
npm i github:ThatOneNeji/CommonFunctions
```

## Usage

```js
const {Logger, MessageBroker, NejiUtils, RegexPatterns} = require('commonfunctions');
```

### Logger

```js
const logging = new Logger({
    owner: 'myapp',            // shown in every log line
    areas: ['web', 'db'],      // creates logging.web and logging.db
    level: 'info',             // trace | debug | info | warn | error | fatal | off (default: debug)
    logFile: 'logs/myapp.log'  // default: logs/server.log
});

logging.system.info('Started');
logging.web.warn('Slow request');
app.use(logging.getExpressLogger());  // Express request logging
```

### MessageBroker

```js
const broker = new MessageBroker();
broker.init({
    logger: logging.system,
    config: [{host: 'rabbitmq.local', port: 5672, active: true}],
    credentials: {user: 'user', password: 'pass'},
    receiveQueue: 'jobs.in',              // optional: queue to consume from
    publishQueueName: 'jobs.out',         // optional: queue to publish to
    externalHandover: (message) => {      // return true to ack the message
        const body = JSON.parse(message.content.toString());
        return true;
    }
});

broker.singlePublish({queuename: 'jobs.out', data: {caid: '1', service: 'ping'}});
await broker.close();  // on shutdown
```

`init()` exits the process if no credentials are supplied.

### RegexPatterns

Patterns are static getters that return a string for `new RegExp()`:

```js
new RegExp(RegexPatterns.RegexPatternValidIPV4Address).test('10.0.0.1');  // true
RegexPatterns.patternNames;  // every available pattern
```

They are also still available on `NejiUtils` (for example `NejiUtils.RegexPatternValidHostname`) for older code.

### NejiUtils

Helpers for validation (`isValidIPv4`, `isValidHost`, `isValidIPv4Netmask`, `validateTargetAddress`), subnets (`getSubnetDetails`), dates (`getCurrentFormattedDateTime`, `unixDateToString`), hashing (`getFileHash`, `buildHash`), MySQL strings (`mysqlEscape`, `mysqlTruncColumn`) and more. See the JSDoc (`npm run documentation`).

## Releasing a new version

1. Bump `version` in `package.json` (and `@version` in `index.js`).
2. Commit, then tag and push:

   ```bash
   git tag v1.9.0
   git push --tags
   ```

Projects using `#semver:^1.9.0` pick up the new tag on their next `npm install` / `npm update`.

## Development

```bash
npm test                 # unit tests (no external services needed)
npm run lint
npm run documentation

# Integration tests against a real RabbitMQ (skipped unless AMQP_HOST is set)
AMQP_HOST=rabbitmq.local AMQP_USER=user AMQP_PASSWORD=pass npm run test:integration
```

## Troubleshooting

**`npm install` refuses to fetch the package from git**
Add `allow-git=root` to the consuming project's `.npmrc` (see [Installing](#installing)).

**`#semver:` range cannot be resolved**
The range is matched against git tags. Make sure a matching `vX.Y.Z` tag has been pushed.
