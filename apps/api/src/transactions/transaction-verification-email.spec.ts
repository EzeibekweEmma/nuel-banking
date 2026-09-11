import { createTransactionVerificationEmail } from "./transaction-verification-email";

describe("createTransactionVerificationEmail", () => {
  it("creates a branded message without putting the code in the subject", () => {
    const email = createTransactionVerificationEmail({
      firstName: "Ada",
      code: "123456",
      amount: "25,000.00",
      currency: "NGN",
      recipientName: "Chidi Okafor",
    });

    expect(email.subject).toBe("Confirm your Nuel Bank transfer");
    expect(email.subject).not.toContain("123456");
    expect(email.html).toContain("123456");
    expect(email.html).toContain("expires in 10 minutes");
    expect(email.text).toContain("Chidi Okafor");
  });

  it("escapes customer-controlled values in HTML", () => {
    const email = createTransactionVerificationEmail({
      firstName: "<Ada>",
      code: "123456",
      amount: "100.00",
      currency: "NGN",
      recipientName: "A & B",
    });

    expect(email.html).toContain("Hi &lt;Ada&gt;,");
    expect(email.html).toContain("A &amp; B");
  });
});
