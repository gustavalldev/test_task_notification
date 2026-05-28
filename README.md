# Notification Preferences Service

TypeScript/Node.js service for managing notification preferences and evaluating whether a notification may be sent to a user. It uses Fastify for REST, Prisma for PostgreSQL persistence, Luxon for timezone-aware quiet hours, and Vitest for tests.

## Requirements

- Node.js 22+
- Docker and Docker Compose for local PostgreSQL

## Setup

```bash
cp .env.example .env
npm install
docker compose up -d postgres
npm run prisma:deploy
npm run dev
```

The service listens on `http://localhost:3000` by default.

## Scripts

```bash
npm run dev              # start Fastify with tsx watch
npm run build            # compile TypeScript to dist/
npm start                # run compiled server
npm test                 # run Vitest tests
npm run typecheck        # strict TypeScript check
npm run prisma:deploy    # apply existing migrations
npm run prisma:migrate   # apply local Prisma migrations
npm run db:push          # push schema without creating a migration
```

## API

### Get preferences

```http
GET /users/:id/preferences
```

Returns the merged preference view: built-in defaults plus user overrides and quiet hours.

### Update preferences

```http
POST /users/:id/preferences
Content-Type: application/json

{
  "preferences": [
    {
      "notificationType": "marketing_email",
      "channel": "email",
      "enabled": false
    }
  ],
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00",
    "timezone": "Europe/Moscow"
  }
}
```

Preference and quiet-hours updates are idempotent through database upserts.

### Evaluate notification send

```http
POST /evaluate
Content-Type: application/json

{
  "userId": "user-1",
  "notificationType": "marketing_sms",
  "channel": "sms",
  "region": "EU",
  "datetime": "2026-05-21T21:30:00Z"
}
```

Response:

```json
{
  "decision": "deny",
  "reason": "blocked_by_global_policy"
}
```

Other stable reasons include `allowed`, `blocked_by_default`,
`blocked_by_user_preference`, and `blocked_by_quiet_hours`.

### Create global policy

```http
POST /policies
Content-Type: application/json

{
  "notificationType": "marketing_sms",
  "channel": "sms",
  "region": "EU"
}
```

`notificationType`, `channel`, and `region` are nullable/optional. `null` means wildcard, so a policy can block a whole region, channel, or notification type.

## Domain Rules

- New users do not require a row in the database. `GET /users/:id/preferences` returns a deterministic default snapshot.
- Default transactional email/SMS/push notifications are enabled.
- Default marketing email and SMS are disabled. Marketing push is enabled so quiet-hours behavior is observable without an extra opt-in step.
- User overrides take precedence over defaults.
- Global policies are evaluated before user preferences because they represent platform/legal constraints.
- Quiet hours use the user's configured IANA timezone and support overnight windows such as `22:00` to `08:00`.
- Quiet hours block suppressible notification types. In this implementation, suppressible means `marketing_*`; transactional notifications remain allowed if no other rule denies them.

## Architecture

```text
src/domain
  Business types, defaults, quiet-hours logic, repository interfaces, service

src/infrastructure/prisma
  PostgreSQL persistence adapters implementing the domain repository interfaces

src/app.ts
  Fastify app factory, REST validation, logging, error mapping

src/server.ts
  Runtime entrypoint and config loading

tests
  Domain and HTTP tests using in-memory repository implementations
```

The domain service depends on interfaces, not Prisma. Tests exercise the same business logic through in-memory repositories, while production uses Prisma repositories backed by PostgreSQL.

## Logging

Fastify/Pino logs preference updates, policy creation, and every evaluation decision with user id, notification type, channel, decision, and reason.

## Production Follow-ups

- Add authentication and authorization for user preference writes and admin policy endpoints.
- Add request IDs, metrics counters for allow/deny reasons, and tracing around repository calls.
- Add migration/seed workflows per environment and database-level constraints for supported enum values.
- Add optimistic concurrency or audit history if preference changes need compliance-grade traceability.
