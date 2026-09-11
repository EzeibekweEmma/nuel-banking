# Nuel Bank API documentation

The NestJS API publishes an interactive OpenAPI 3 document through Swagger UI.

## Local URLs

- Swagger UI: `http://localhost:3001/api/docs`
- OpenAPI JSON: `http://localhost:3001/api/docs-json`
- Health check: `http://localhost:3001/api/health`

The host and port follow the deployed API URL and `API_PORT` configuration.
For example, production documentation is available at
`https://api.example.com/api/docs` when that is the public API origin.

## Trying protected endpoints

1. Use `POST /api/auth/login` or `POST /api/auth/register`.
2. Copy the returned `accessToken`.
3. Select **Authorize** in Swagger UI.
4. Paste the access token into the bearer-authentication field.

Swagger UI keeps the authorization value during the current browser session.
Do not paste production credentials into documentation hosted by an untrusted
party.

## Request-specific headers

Transfer and demo-funding requests require an `Idempotency-Key`. Reusing a key
with the same request prevents duplicate balance changes. The optional
`X-Device-Fingerprint` and `X-Location` transfer headers are untrusted fraud
hints; they are never treated as verified device or location data.

Input constraints, enums, pagination, transaction filters, downloadable
statement formats, authentication requirements, and administrator-only routes
are described directly in the OpenAPI document.
