import { createPasswordResetEmail } from "./password-reset-email";

describe("createPasswordResetEmail", () => {
  it("creates branded HTML and plain-text password reset messages", () => {
    const email = createPasswordResetEmail(
      "Emmanuel",
      "https://bank.example/reset-password?token=secure-token",
    );

    expect(email.subject).toBe("Reset your Nuel Bank password");
    expect(email.html).toContain("Hi Emmanuel,");
    expect(email.html).toContain("Create new password");
    expect(email.html).toContain("expires in 15 minutes");
    expect(email.html).not.toContain("<img");
    expect(email.text).toContain(
      "https://bank.example/reset-password?token=secure-token",
    );
  });

  it("escapes customer and URL values in the HTML version", () => {
    const email = createPasswordResetEmail(
      "<Customer>",
      "https://bank.example/reset?token=a&next=\"account\"",
    );

    expect(email.html).toContain("Hi &lt;Customer&gt;,");
    expect(email.html).toContain("token=a&amp;next=&quot;account&quot;");
    expect(email.html).not.toContain("Hi <Customer>,");
  });
});
