export interface TransactionalEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createEmailVerificationEmail(
  firstName: string,
  verificationUrl: string,
): TransactionalEmail {
  const name = firstName.trim() || "there";
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(verificationUrl);

  return {
    subject: "Verify your Nuel Bank email address",
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Verify your Nuel Bank email address</title>
  </head>
  <body style="margin:0;padding:0;background:#eef3f0;color:#18352e;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Confirm your email to unlock secure payments on Nuel Bank.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef3f0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dce5e1;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="background:#092d24;padding:24px 32px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;border-radius:12px;background:#d8f85c;color:#092d24;font-size:20px;font-weight:800;">N</td>
                    <td style="padding-left:12px;color:#ffffff;font-size:18px;font-weight:700;">Nuel Bank<br><span style="color:#9dbbb3;font-size:11px;font-weight:400;letter-spacing:0.5px;">SECURE DIGITAL BANKING</span></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px 32px;">
                <div style="display:inline-block;border-radius:999px;background:#edf7f3;color:#087a5b;font-size:11px;font-weight:700;letter-spacing:0.7px;padding:7px 11px;">ONE QUICK STEP</div>
                <h1 style="margin:18px 0 12px;color:#18352e;font-size:30px;line-height:1.2;letter-spacing:-0.8px;">Confirm your email</h1>
                <p style="margin:0 0 12px;color:#38544d;font-size:15px;line-height:1.7;">Hi ${safeName},</p>
                <p style="margin:0;color:#5f716c;font-size:15px;line-height:1.7;">Welcome to Nuel Bank. Verify this email address to activate deposits, transfers, and beneficiary management.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
                  <tr>
                    <td align="center" bgcolor="#087a5b" style="border-radius:12px;">
                      <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:15px 24px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Verify email address&nbsp;&nbsp;→</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 26px;border-radius:12px;background:#f5f8f6;">
                  <tr>
                    <td style="padding:16px 18px;color:#38544d;font-size:13px;line-height:1.6;"><strong style="color:#18352e;">This link expires in 24 hours.</strong><br>For your security, it can only be used once.</td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;color:#71817c;font-size:12px;line-height:1.6;">If the button does not work, copy and paste this address into your browser:</p>
                <p style="margin:0;word-break:break-all;color:#087a5b;font-size:12px;line-height:1.6;"><a href="${safeUrl}" style="color:#087a5b;text-decoration:underline;">${safeUrl}</a></p>
                <hr style="margin:30px 0;border:0;border-top:1px solid #e5ebe8;">
                <p style="margin:0;color:#71817c;font-size:12px;line-height:1.7;"><strong style="color:#38544d;">Didn’t create this account?</strong> You can safely ignore this email. Nuel staff will never ask for your password, PIN, or one-time code.</p>
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

Confirm your email

Hi ${name},

Welcome to Nuel Bank. Verify this email address to activate deposits, transfers, and beneficiary management.

Verify your email:
${verificationUrl}

This link expires in 24 hours and can only be used once.

If you did not create this account, you can safely ignore this email. Nuel staff will never ask for your password, PIN, or one-time code.`,
  };
}
