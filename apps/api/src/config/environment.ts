const MINIMUM_SECRET_LENGTH = 32;
const BOOLEAN_VALUES = new Set(["true", "false"]);

function requireString(
  environment: Record<string, unknown>,
  key: string,
): string {
  const value = environment[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value.trim();
}

function validateUrl(value: string, key: string, protocols: string[]): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Environment variable ${key} must be a valid URL`);
  }
  if (!protocols.includes(parsed.protocol)) {
    throw new Error(
      `Environment variable ${key} must use ${protocols.join(" or ")}`,
    );
  }
}

function validateOptionalBoolean(
  environment: Record<string, unknown>,
  key: string,
): void {
  const value = environment[key];
  if (
    value !== undefined &&
    (typeof value !== "string" || !BOOLEAN_VALUES.has(value.toLowerCase()))
  ) {
    throw new Error(`Environment variable ${key} must be true or false`);
  }
}

function validateOptionalSecret(
  environment: Record<string, unknown>,
  key: string,
): void {
  const value = environment[key];
  if (
    value !== undefined &&
    (typeof value !== "string" || value.trim().length < MINIMUM_SECRET_LENGTH)
  ) {
    throw new Error(
      `Environment variable ${key} must contain at least ${MINIMUM_SECRET_LENGTH} characters`,
    );
  }
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnvironment = environment.NODE_ENV;
  if (
    nodeEnvironment !== undefined &&
    !["development", "test", "production"].includes(String(nodeEnvironment))
  ) {
    throw new Error(
      "Environment variable NODE_ENV must be development, test, or production",
    );
  }

  const databaseUrl = requireString(environment, "DATABASE_URL");
  validateUrl(databaseUrl, "DATABASE_URL", ["postgres:", "postgresql:"]);

  const accessSecret = requireString(environment, "JWT_ACCESS_SECRET");
  const refreshSecret = requireString(environment, "JWT_REFRESH_SECRET");
  if (
    accessSecret.length < MINIMUM_SECRET_LENGTH ||
    refreshSecret.length < MINIMUM_SECRET_LENGTH
  ) {
    throw new Error(
      `JWT secrets must contain at least ${MINIMUM_SECRET_LENGTH} characters`,
    );
  }
  if (accessSecret === refreshSecret) {
    throw new Error(
      "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different",
    );
  }

  const frontendUrl = requireString(environment, "FRONTEND_URL");
  validateUrl(frontendUrl, "FRONTEND_URL", ["http:", "https:"]);

  const port = Number(environment.API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Environment variable API_PORT must be a valid port");
  }

  validateOptionalBoolean(environment, "DEMO_FUNDING_ENABLED");
  validateOptionalBoolean(environment, "SMTP_SECURE");
  validateOptionalBoolean(environment, "SMTP_REQUIRE_TLS");
  validateOptionalSecret(environment, "TRANSACTION_VERIFICATION_SECRET");
  validateOptionalSecret(environment, "EMAIL_JOB_ENCRYPTION_SECRET");

  const smtpKeys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM"];
  const smtpConfigured = smtpKeys.some(
    (key) => typeof environment[key] === "string" && environment[key] !== "",
  );
  if (smtpConfigured) {
    requireString(environment, "SMTP_HOST");
    const from = requireString(environment, "EMAIL_FROM");
    if (!from.includes("@")) {
      throw new Error(
        "Environment variable EMAIL_FROM must contain an email address",
      );
    }
    const smtpPort = Number(environment.SMTP_PORT ?? 587);
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65_535) {
      throw new Error("Environment variable SMTP_PORT must be a valid port");
    }
    const user = environment.SMTP_USER;
    const password = environment.SMTP_PASSWORD;
    if (Boolean(user) !== Boolean(password)) {
      throw new Error(
        "SMTP_USER and SMTP_PASSWORD must either both be set or both be omitted",
      );
    }
  }

  const validated: Record<string, unknown> = {
    ...environment,
    API_PORT: String(port),
    FRONTEND_URL: frontendUrl.replace(/\/$/, ""),
  };
  for (const key of [
    "DEMO_FUNDING_ENABLED",
    "SMTP_SECURE",
    "SMTP_REQUIRE_TLS",
  ]) {
    if (typeof validated[key] === "string") {
      validated[key] = validated[key].toLowerCase();
    }
  }
  return validated;
}
