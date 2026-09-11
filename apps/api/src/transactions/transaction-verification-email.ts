interface TransactionVerificationEmail {
  subject: string;
  html: string;
  text: string;
}

export interface TransactionVerificationEmailDetails {
  firstName: string;
  code: string;
  amount: string;
  currency: string;
  recipientName: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createTransactionVerificationEmail(
  details: TransactionVerificationEmailDetails,
): TransactionVerificationEmail {
  const name = details.firstName.trim() || "there";
  const safeName = escapeHtml(name);
  const safeAmount = escapeHtml(`${details.currency} ${details.amount}`);
  const safeRecipient = escapeHtml(details.recipientName);

  return {
    subject: "Confirm your Nuel Bank transfer",
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Confirm your Nuel Bank transfer</title>
  </head>
  <body style="margin:0;padding:0;background:#eef3f0;color:#18352e;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Use this one-time code to confirm your Nuel Bank transfer.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef3f0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dce5e1;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="background:#092d24;padding:24px 32px;color:#ffffff;font-size:18px;font-weight:700;">
                <span style="display:inline-block;width:44px;height:44px;border-radius:12px;background:#d8f85c;color:#092d24;text-align:center;line-height:44px;margin-right:12px;">N</span>Nuel Bank
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px 32px;">
                <div style="display:inline-block;border-radius:999px;background:#fff5dc;color:#8b5c00;font-size:11px;font-weight:700;letter-spacing:0.7px;padding:7px 11px;">TRANSFER SECURITY CHECK</div>
                <h1 style="margin:18px 0 12px;color:#18352e;font-size:30px;line-height:1.2;letter-spacing:-0.8px;">Confirm it’s you</h1>
                <p style="margin:0 0 12px;color:#38544d;font-size:15px;line-height:1.7;">Hi ${safeName},</p>
                <p style="margin:0;color:#5f716c;font-size:15px;line-height:1.7;">Use this code to confirm your transfer of <strong>${safeAmount}</strong> to <strong>${safeRecipient}</strong>.</p>
                <div style="margin:28px 0;border-radius:16px;background:#f3f7f5;padding:24px;text-align:center;">
                  <p style="margin:0 0 9px;color:#71817c;font-size:11px;font-weight:700;letter-spacing:1px;">ONE-TIME CODE</p>
                  <p style="margin:0;color:#092d24;font-family:Courier New,monospace;font-size:34px;font-weight:800;letter-spacing:9px;">${details.code}</p>
                </div>
                <p style="margin:0;color:#5f716c;font-size:13px;line-height:1.7;"><strong style="color:#18352e;">This code expires in 10 minutes.</strong> Enter it only in the Nuel Bank transfer screen. Never share it in chat or over the phone.</p>
                <hr style="margin:30px 0;border:0;border-top:1px solid #e5ebe8;">
                <p style="margin:0;color:#71817c;font-size:12px;line-height:1.7;"><strong style="color:#38544d;">Don’t recognize this transfer?</strong> Do not use the code. Your money has not moved; the transfer will remain pending.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f7f9f8;padding:20px 32px;border-top:1px solid #e5ebe8;color:#83918d;font-size:11px;line-height:1.6;">This automated security message was sent by Nuel Bank. Please do not reply.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `NUEL BANK

Confirm your transfer

Hi ${name},

Use this one-time code to confirm your transfer of ${details.currency} ${details.amount} to ${details.recipientName}:

${details.code}

This code expires in 10 minutes. Enter it only in the Nuel Bank transfer screen. Never share it in chat or over the phone.

If you do not recognize this transfer, do not use the code. Your money has not moved.`,
  };
}
