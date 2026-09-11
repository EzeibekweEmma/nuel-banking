import { validateEnvironment } from "./environment";

const validEnvironment = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/nuel",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  FRONTEND_URL: "http://localhost:3000",
};

describe("validateEnvironment", () => {
  it("accepts the required configuration and applies the API port default", () => {
    expect(validateEnvironment(validEnvironment)).toEqual(
      expect.objectContaining({ API_PORT: "3001" }),
    );
  });

  it("rejects short or reused JWT secrets", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        JWT_REFRESH_SECRET: validEnvironment.JWT_ACCESS_SECRET,
      }),
    ).toThrow("must be different");
    expect(() =>
      validateEnvironment({ ...validEnvironment, JWT_ACCESS_SECRET: "short" }),
    ).toThrow("at least 32 characters");
  });

  it("rejects partial SMTP credentials", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        SMTP_HOST: "smtp.example.com",
        EMAIL_FROM: "Nuel <mail@example.com>",
        SMTP_USER: "mailer@example.com",
      }),
    ).toThrow("must either both be set or both be omitted");
  });
});
