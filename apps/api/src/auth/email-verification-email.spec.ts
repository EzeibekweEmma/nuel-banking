import { createEmailVerificationEmail } from "./email-verification-email";

describe("createEmailVerificationEmail", () => {
  it("creates branded HTML and plain-text verification messages", () => {
    const email = createEmailVerificationEmail(
      "Emmanuel",
      "https://bank.example/verify-email?token=secure-token",
    );

    expect(email.subject).toBe("Verify your Nuel Bank email address");
    expect(email.html).toContain("Hi Emmanuel,");
    expect(email.html).toContain("Verify email address");
    expect(email.html).toContain("expires in 24 hours");
    expect(email.html).not.toContain("<img");
    expect(email.text).toContain("verify-email?token=secure-token");
  });

  it("escapes customer and URL values in the HTML version", () => {
    const email = createEmailVerificationEmail(
      "<Customer>",
      'https://bank.example/verify?token=a&next="account"',
    );

    expect(email.html).toContain("Hi &lt;Customer&gt;,");
    expect(email.html).toContain("token=a&amp;next=&quot;account&quot;");
    expect(email.html).not.toContain("Hi <Customer>,");
  });
});
