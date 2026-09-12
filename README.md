# Nuel Bank

Nuel Bank is an full-stack banking application built with Next.js, NestJS, PostgreSQL, Prisma, JWT authentication, Gemini-powered assistance, and a rule-based fraud engine.

The project includes customer and administrator interfaces, email verification, password recovery, session management, demo funding, transfers, transaction statements, notifications, account controls, audit logs, and interactive Swagger API documentation.

> Demo warning: this project does not connect to a real payment network. Demo
> balances and deposits have no monetary value.

## Technology

- Web: Next.js 15, React 19, TypeScript, Tailwind CSS
- API: NestJS 11, TypeScript
- Database: PostgreSQL with Prisma 6
- Authentication: access and refresh JWTs with revocable sessions
- Email: SMTP with a PostgreSQL-backed retry queue
- Assistant: Google Gemini
- API documentation: OpenAPI 3 with Swagger UI

## Repository structure

```text
apps/
  api/                 NestJS API
  web/                 Next.js customer and admin application
docs/
  API.md               Swagger usage notes
prisma/
  migrations/          PostgreSQL migrations
  schema.prisma        Database schema
.env.example           Environment-variable template
package.json           Workspace commands
```

## Prerequisites

Install the following before continuing:

- Node.js 22.x
- pnpm 11.20.0 through Corepack
- PostgreSQL 15 or newer
- An SMTP account for email verification, password reset, and transfer codes
- A Gemini API key if you want AI assistant responses

Enable the package manager supplied by Node.js:

```bash
corepack enable
corepack prepare pnpm@11.20.0 --activate
```

## Local setup

### 1. Install dependencies

From the repository root:

```bash
pnpm install --frozen-lockfile
```

### 2. Create the PostgreSQL database

Create an empty database and a user that owns it. For example, while signed in
as a PostgreSQL administrator:

```sql
CREATE USER nuel_bank WITH PASSWORD 'choose-a-local-password';
CREATE DATABASE ai_banking OWNER nuel_bank;
```

You can use an existing PostgreSQL user and database instead. The configured
user must be able to create tables, indexes, and enum types in the selected
database.

### 3. Configure the environment

Copy the supplied template:

```bash
cp .env.example .env
```

Update `.env` with your local database credentials and unique secrets. A local
database URL based on the example above would be:

```dotenv
DATABASE_URL="postgresql://nuel_bank:choose-a-local-password@localhost:5432/ai_banking?schema=public"
```

Generate independent application secrets with:

```bash
openssl rand -base64 48
```

Run the command separately for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`EMAIL_JOB_ENCRYPTION_SECRET`, and `TRANSACTION_VERIFICATION_SECRET`. The two JWT
secrets must be different and every application secret must contain at least 32
characters.

The API reads the root `.env` file. The frontend browser API URL defaults to
`http://localhost:3001/api`. If you change it, create `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

`NEXT_PUBLIC_API_URL` is embedded into the frontend during its build, so set it
before running a production build.

### 4. Apply migrations and generate Prisma Client

```bash
pnpm prisma:deploy
pnpm prisma:generate
```

Use `pnpm prisma:migrate` instead of `prisma:deploy` only when developing a new
schema migration.

### 5. Create an administrator

Set strong local values for `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then
run:

```bash
pnpm admin:seed
```

The command is idempotent: running it again promotes or updates the role of the
configured email without creating a duplicate user. The administrator email is
marked verified automatically.

### 6. Add academic demo data (optional)

Populate the local database with 300 customers and realistic linked activity:

```bash
pnpm demo:seed
```

This is a data seed, not a schema migration. It creates customer accounts, deposits, beneficiaries, incoming and outgoing transfers, fraud assessments, held and rejected transactions, notifications, devices, sessions, assistant conversations, and audit logs. Generated records have stable IDs, so running the command again with the same count does not duplicate them. The command is blocked when `NODE_ENV=production`.

The seeded logins are:

| Role          | Email                  | Default password |
| ------------- | ---------------------- | ---------------- |
| Customer      | `demo001@nuel.test`    | `NuelDemo@2026!` |
| Administrator | `admin.demo@nuel.test` | `NuelDemo@2026!` |

All generated customer addresses follow `demo001@nuel.test` through the configured customer count. Set `DEMO_SEED_COUNT` to an integer rom 200 through 500 and set `DEMO_SEED_PASSWORD` to change the hared local password. Use the same count on later runs; use a disposable database if you want to regenerate a different-sized dataset from scratch.

### 7. Start the application

```bash
pnpm dev
```

The development services are available at:

| Service         | URL                                   |
| --------------- | ------------------------------------- |
| Web application | `http://localhost:3000`               |
| NestJS API      | `http://localhost:3001`               |
| Health endpoint | `http://localhost:3001/api/health`    |
| Swagger UI      | `http://localhost:3001/api/docs`      |
| OpenAPI JSON    | `http://localhost:3001/api/docs-json` |

To run one application at a time, use `pnpm dev:web` or `pnpm dev:api`.

## Environment variables

| Variable                          | Required    | Purpose                                                                                 |
| --------------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | Yes         | PostgreSQL connection URL used by Prisma.                                               |
| `JWT_ACCESS_SECRET`               | Yes         | Signs short-lived access tokens; minimum 32 characters.                                 |
| `JWT_REFRESH_SECRET`              | Yes         | Signs refresh tokens; minimum 32 characters and different from the access secret.       |
| `FRONTEND_URL`                    | Yes         | Exact browser origin permitted by API CORS, without a trailing slash.                   |
| `API_PORT`                        | No          | API listening port; defaults to `3001`.                                                 |
| `NEXT_PUBLIC_API_URL`             | No          | Browser-visible API base URL; defaults to `http://localhost:3001/api`.                  |
| `NODE_ENV`                        | No          | `development`, `test`, or `production`.                                                 |
| `DEMO_FUNDING_ENABLED`            | No          | Enables controlled demo deposits. Defaults on outside production and off in production. |
| `GEMINI_API_KEY`                  | Assistant   | Enables Gemini assistant responses.                                                     |
| `GEMINI_MODEL`                    | No          | Gemini model name used by the assistant.                                                |
| `SMTP_HOST`                       | Email       | SMTP server hostname.                                                                   |
| `SMTP_PORT`                       | Email       | SMTP port, normally `587` or `465`.                                                     |
| `SMTP_SECURE`                     | Email       | Use implicit TLS; normally `true` for port 465.                                         |
| `SMTP_REQUIRE_TLS`                | Email       | Require STARTTLS when supported by the selected port.                                   |
| `SMTP_USER`                       | Email       | SMTP login; set together with `SMTP_PASSWORD`.                                          |
| `SMTP_PASSWORD`                   | Email       | SMTP password or provider application password.                                         |
| `EMAIL_FROM`                      | Email       | Verified sender, for example `Nuel Bank <banking@example.com>`.                         |
| `EMAIL_JOB_ENCRYPTION_SECRET`     | Recommended | Encrypts queued email payloads in PostgreSQL.                                           |
| `TRANSACTION_VERIFICATION_SECRET` | Recommended | Adds independent protection to transfer verification codes.                             |
| `ADMIN_EMAIL`                     | Admin seed  | Email used by `pnpm admin:seed`.                                                        |
| `ADMIN_PASSWORD`                  | Admin seed  | Administrator password; minimum 12 characters.                                          |
| `DEMO_SEED_COUNT`                 | No          | Number of academic demo customers; 200–500, default `300`.                              |
| `DEMO_SEED_PASSWORD`              | No          | Shared local-only demo password; minimum 12 characters.                                 |

### SMTP configuration

If any SMTP variable is supplied, provide the full valid SMTP configuration.
The following combinations are typical; confirm the exact values with your mail
provider.

| Connection   | Port | `SMTP_SECURE` | `SMTP_REQUIRE_TLS` |
| ------------ | ---: | ------------- | ------------------ |
| STARTTLS     |  587 | `false`       | `true`             |
| Implicit TLS |  465 | `true`        | `true`             |

Use a verified sending domain and a real sender address. Never commit SMTP
credentials. Email requests are queued in PostgreSQL and processed in the
background with retry delays, so the HTTP request does not wait for SMTP.

In development, verification and reset responses may include direct development
links. Those links are intentionally omitted when `NODE_ENV=production`.

## Useful commands

Run commands from the repository root unless noted otherwise.

| Command                              | Description                                           |
| ------------------------------------ | ----------------------------------------------------- |
| `pnpm dev`                           | Run the web and API development servers.              |
| `pnpm dev:web`                       | Run only Next.js.                                     |
| `pnpm dev:api`                       | Run only NestJS.                                      |
| `pnpm build`                         | Generate Prisma Client and build both applications.   |
| `pnpm typecheck`                     | Type-check the complete workspace.                    |
| `pnpm lint`                          | Lint the web and API projects.                        |
| `pnpm test`                          | Run API unit tests.                                   |
| `pnpm --filter api test:integration` | Run PostgreSQL integration tests using `.env`.        |
| `pnpm prisma:generate`               | Regenerate Prisma Client after schema changes.        |
| `pnpm prisma:deploy`                 | Apply committed migrations without creating new ones. |
| `pnpm prisma:migrate`                | Create and apply a development migration.             |
| `pnpm prisma:status`                 | Show migration status.                                |
| `pnpm prisma:studio`                 | Open Prisma Studio for local inspection.              |
| `pnpm admin:seed`                    | Create or promote the configured administrator.       |
| `pnpm demo:seed`                     | Seed 200–500 mock customers and linked bank activity. |

## API documentation

Swagger documents public, customer-authenticated, email-verified, and
administrator-only operations. To try a protected route:

1. Call `POST /api/auth/login` or `POST /api/auth/register`.
2. Copy the returned `accessToken`.
3. Select **Authorize** in Swagger UI.
4. Paste the access token into the bearer-token field.

See [docs/API.md](docs/API.md) for additional details about idempotency headers,
fraud hints, filters, and statement downloads.

## Verification before committing

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Integration tests modify the configured test data. Run them only against a local
or disposable PostgreSQL database:

```bash
pnpm --filter api test:integration
```

## Production setup

1. Provision PostgreSQL and configure all secrets in the hosting platform.
2. Set `NODE_ENV=production`, the public `FRONTEND_URL`, and the production
   `NEXT_PUBLIC_API_URL`.
3. Configure a verified SMTP sender and a production Gemini key if required.
4. Install dependencies and apply migrations:

   ```bash
   pnpm install --frozen-lockfile
   pnpm prisma:deploy
   pnpm build
   ```

5. Start the applications with separate supervised processes:

   ```bash
   pnpm start:api
   pnpm --filter web start
   ```

6. Place both services behind HTTPS, route the public API origin to the NestJS
   process, and allow only the configured frontend origin through CORS.

The Swagger paths remain relative to the deployed API origin, for example
`https://api.example.com/api/docs`.

## Troubleshooting

### Port 3001 is already in use

Another API process is listening on the configured port. Locate it with:

```bash
lsof -i :3001
```

Stop the duplicate process, or change `API_PORT` and update
`NEXT_PUBLIC_API_URL` to match. Do not start a second API instance on the same
port.

### Prisma Client is missing a model or property

The generated client is older than `prisma/schema.prisma`. Regenerate it:

```bash
pnpm prisma:generate
```

If the database itself is missing the model, also apply migrations with
`pnpm prisma:deploy`.

### The API cannot connect to PostgreSQL

Confirm PostgreSQL is running, the database exists, and `DATABASE_URL` contains
the correct host, port, credentials, and database name. Then run:

```bash
pnpm prisma:status
```

### Email is not delivered

Check the SMTP host, port, TLS mode, credentials, verified `EMAIL_FROM` domain,
and the provider's spam or activity logs. Queued jobs and their retry status can
be inspected with `pnpm prisma:studio` in the `EmailJob` table.

### Browser requests are blocked by CORS

Set `FRONTEND_URL` to the exact origin shown in the browser, including protocol
and port but excluding paths and a trailing slash. Restart the API after changing
it.

## Security notes

- Never commit `.env`, production credentials, JWTs, PINs, OTPs, or SMTP keys.
- Use unique secrets and rotate any value that has been exposed.
- Run production services behind HTTPS.
- Do not enable demo funding for a real financial system.
- Client-provided device and location headers are fraud hints, not trusted facts.
- The Gemini assistant cannot access PostgreSQL directly or perform transfers.

## License

This repository is intended for academic and demonstration use. Add an explicit
license before distributing or reusing it outside that context.
