import {
  createStatementCsv,
  createStatementPdf,
  StatementMetadata,
  StatementRow,
} from "./statement-export";

describe("statement exports", () => {
  const metadata: StatementMetadata = {
    customerName: "Ada Okafor",
    accountNumber: "1234567890",
    currency: "NGN",
    generatedAt: new Date("2026-09-11T12:00:00.000Z"),
    periodLabel: "All available activity",
  };
  const rows: StatementRow[] = [
    {
      date: new Date("2026-09-10T10:00:00.000Z"),
      type: "TRANSFER",
      direction: "DEBIT",
      description: "School fees",
      reference: "reference-1",
      status: "COMPLETED",
      amount: "2500.00",
      balanceAfter: "",
    },
  ];

  it("creates an Excel-friendly CSV statement", () => {
    const csv = createStatementCsv(metadata, rows).toString("utf8");
    expect(csv).toContain("Nuel Bank account statement");
    expect(csv).toContain('"2500.00"');
    expect(csv).toContain('"DEBIT"');
  });

  it("creates a valid PDF document containing statement details", () => {
    const pdf = createStatementPdf(metadata, rows).toString("utf8");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("NUEL BANK - ACCOUNT STATEMENT");
    expect(pdf).toContain("xref");
    expect(pdf.endsWith("%%EOF")).toBe(true);
  });
});
