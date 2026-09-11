export interface StatementMetadata {
  customerName: string;
  accountNumber: string;
  currency: string;
  generatedAt: Date;
  periodLabel: string;
}

export interface StatementRow {
  date: Date;
  type: string;
  direction: "CREDIT" | "DEBIT";
  description: string;
  reference: string;
  status: string;
  amount: string;
  balanceAfter: string;
}

function csvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function createStatementCsv(
  metadata: StatementMetadata,
  rows: StatementRow[],
): Buffer {
  const headings = [
    "Date",
    "Type",
    "Direction",
    "Description",
    "Reference",
    "Status",
    "Credit",
    "Debit",
    "Balance after",
    "Currency",
  ];
  const data = rows.map((row) => [
    row.date.toISOString(),
    row.type,
    row.direction,
    row.description,
    row.reference,
    row.status,
    row.direction === "CREDIT" ? row.amount : "",
    row.direction === "DEBIT" ? row.amount : "",
    row.balanceAfter,
    metadata.currency,
  ]);
  const lines = [
    ["Nuel Bank account statement"],
    ["Customer", metadata.customerName],
    ["Account", metadata.accountNumber],
    ["Period", metadata.periodLabel],
    ["Generated", metadata.generatedAt.toISOString()],
    [],
    headings,
    ...data,
  ];
  return Buffer.from(
    `\uFEFF${lines.map((line) => line.map(csvValue).join(",")).join("\r\n")}`,
    "utf8",
  );
}

function pdfText(value: string): string {
  return Array.from(value.normalize("NFKD"))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code <= 126;
    })
    .join("")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function fit(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

export function createStatementPdf(
  metadata: StatementMetadata,
  rows: StatementRow[],
): Buffer {
  const rowsPerPage = 28;
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(rows.length / rowsPerPage)) },
    (_, index) => rows.slice(index * rowsPerPage, (index + 1) * rowsPerPage),
  );
  const objects = new Map<number, string>();
  const pageIds = pages.map((_, index) => 4 + index * 2);
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((pageRows, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const heading = [
      "NUEL BANK - ACCOUNT STATEMENT",
      `${metadata.customerName} | Account ${metadata.accountNumber} | ${metadata.currency}`,
      `Period: ${metadata.periodLabel} | Generated: ${metadata.generatedAt.toISOString()}`,
      "",
      "DATE       TYPE      DIRECTION DESCRIPTION                  REFERENCE          STATUS     AMOUNT",
      "----------------------------------------------------------------------------------------------",
    ];
    const transactionLines = pageRows.map((row) => {
      const sign = row.direction === "CREDIT" ? "+" : "-";
      return [
        row.date.toISOString().slice(0, 10).padEnd(11),
        fit(row.type, 9).padEnd(10),
        row.direction.padEnd(10),
        fit(row.description, 28).padEnd(29),
        fit(row.reference, 18).padEnd(19),
        fit(row.status, 9).padEnd(10),
        `${sign}${row.amount}`,
      ].join("");
    });
    const footer = `Page ${index + 1} of ${pages.length} | This statement was generated electronically.`;
    const lines = [...heading, ...transactionLines, "", footer];
    const stream = [
      "BT",
      "/F1 8 Tf",
      "36 558 Td",
      "14 TL",
      ...lines.map((line) => `(${pdfText(line)}) Tj T*`),
      "ET",
    ].join("\n");
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.set(
      contentId,
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    );
  });

  const objectCount = 3 + pages.length * 2;
  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id <= objectCount; id += 1) {
    offsets[id] = Buffer.byteLength(document, "utf8");
    document += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document, "utf8");
  document += `xref\n0 ${objectCount + 1}\n`;
  document += "0000000000 65535 f \n";
  for (let id = 1; id <= objectCount; id += 1) {
    document += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(document, "utf8");
}
