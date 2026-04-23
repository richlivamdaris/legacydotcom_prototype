import nodemailer, { type Transporter } from "nodemailer";

// Mailer that uses a real SMTP if configured via env, else Ethereal
// (https://ethereal.email) which creates a test inbox + preview URL.
// Preview URLs are logged to the console so a "real email" can be viewed
// without needing live SMTP credentials.

let cached: Transporter | null = null;
let fromAddress = "Legacy.com <no-reply@legacy.com>";
let isEthereal = false;

async function buildTransport(): Promise<Transporter> {
  const host = process.env.SMTP_HOST;
  if (host) {
    fromAddress = process.env.SMTP_FROM ?? fromAddress;
    isEthereal = false;
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: String(process.env.SMTP_SECURE ?? "false") === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
        : undefined,
    });
  }

  const test = await nodemailer.createTestAccount();
  fromAddress = `Legacy.com Prototype <${test.user}>`;
  isEthereal = true;
  console.log(
    `[mailer] Ethereal test account ready. user=${test.user} preview=https://ethereal.email/messages`
  );
  return nodemailer.createTransport({
    host: test.smtp.host,
    port: test.smtp.port,
    secure: test.smtp.secure,
    auth: { user: test.user, pass: test.pass },
  });
}

async function transport(): Promise<Transporter> {
  if (!cached) cached = await buildTransport();
  return cached;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(input: SendMailInput): Promise<{ messageId: string; previewUrl: string | null }> {
  const t = await transport();
  const info = await t.sendMail({
    from: fromAddress,
    to: input.to,
    subject: input.subject,
    text: input.text ?? input.html.replace(/<[^>]+>/g, ""),
    html: input.html,
  });
  const previewUrl = isEthereal ? (nodemailer.getTestMessageUrl(info) || null) : null;
  if (previewUrl) {
    console.log(`[mailer] sent to=${input.to} subject="${input.subject}" preview=${previewUrl}`);
  } else {
    console.log(`[mailer] sent to=${input.to} subject="${input.subject}" id=${info.messageId}`);
  }
  return { messageId: String(info.messageId), previewUrl };
}

export async function sendObituaryConfirmationEmail(params: {
  to: string;
  funeralHomeName: string;
  deceasedName: string;
  newspaper: string;
  amountUsd: number;
  friendlyInvoiceId: string;
  invoiceHostedUrl: string | null;
  publicationDate: string | null;
  paymentMode: "invoice" | "on_account";
}): Promise<void> {
  const amount = `$${params.amountUsd.toFixed(2)}`;
  const payLine = params.paymentMode === "on_account"
    ? `<p style="color:#555;">This listing has been added to your account. A statement will be sent at the end of the billing period.</p>`
    : params.invoiceHostedUrl
      ? `<p><a href="${params.invoiceHostedUrl}" style="background:#1a8fd1;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:700;">Pay invoice now</a></p>`
      : `<p style="color:#555;">An invoice will be sent separately.</p>`;

  const html = `<!doctype html><html><body style="font-family:'Open Sans',Arial,sans-serif;background:#f0f3f7;padding:24px;">
    <div style="max-width:560px;margin:auto;background:#fff;border-radius:10px;padding:24px;">
      <h2 style="color:#1a8fd1;margin-top:0;">Listing confirmed</h2>
      <p>Dear ${params.funeralHomeName},</p>
      <p>Your obituary listing has been received:</p>
      <table style="width:100%;border-collapse:collapse;margin:14px 0;">
        <tr><td style="padding:6px 0;color:#888;">Deceased</td><td style="padding:6px 0;font-weight:600;">${params.deceasedName}</td></tr>
        <tr><td style="padding:6px 0;color:#888;">Newspaper</td><td style="padding:6px 0;font-weight:600;">${params.newspaper}</td></tr>
        <tr><td style="padding:6px 0;color:#888;">Publication date</td><td style="padding:6px 0;">${params.publicationDate ?? "Pending"}</td></tr>
        <tr><td style="padding:6px 0;color:#888;">Amount</td><td style="padding:6px 0;font-weight:700;">${amount}</td></tr>
        <tr><td style="padding:6px 0;color:#888;">Invoice</td><td style="padding:6px 0;font-weight:600;">${params.friendlyInvoiceId}</td></tr>
      </table>
      ${payLine}
      <p style="color:#aaa;font-size:12px;margin-top:20px;">This is a prototype notification from Legacy.com's sandbox.</p>
    </div></body></html>`;

  await sendMail({ to: params.to, subject: `Obituary listing confirmed — ${params.deceasedName}`, html });
}

export async function sendRewardCardEmail(params: {
  to: string;
  amountUsd: number;
  last4: string;
  expMonth: number;
  expYear: number;
  dashboardUrl: string;
}): Promise<void> {
  const amount = `$${params.amountUsd.toFixed(2)}`;
  const exp = `${String(params.expMonth).padStart(2, "0")}/${String(params.expYear).slice(-2)}`;
  const html = `<!doctype html><html><body style="font-family:'Open Sans',Arial,sans-serif;background:#f0f3f7;padding:24px;">
    <div style="max-width:560px;margin:auto;background:#fff;border-radius:10px;padding:24px;">
      <h2 style="color:#1a8fd1;margin-top:0;">Your virtual card is ready</h2>
      <p>A Stripe Issuing virtual Visa card has been created and loaded with <strong>${amount}</strong>.</p>
      <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);color:#fff;border-radius:12px;padding:22px;">
        <div style="font-size:11px;opacity:.6;text-transform:uppercase;letter-spacing:.1em;">Legacy Loyalty</div>
        <div style="font-family:monospace;font-size:20px;letter-spacing:.15em;margin-top:10px;">•••• •••• •••• ${params.last4}</div>
        <div style="display:flex;gap:20px;margin-top:14px;font-size:13px;">
          <div><div style="opacity:.5;font-size:10px;text-transform:uppercase;">Expires</div><div style="font-family:monospace;">${exp}</div></div>
          <div style="margin-left:auto;"><div style="opacity:.5;font-size:10px;text-transform:uppercase;text-align:right;">Balance</div><div style="font-size:20px;font-weight:700;color:#7ee8a2;">${amount}</div></div>
        </div>
      </div>
      <p style="margin-top:20px;">Use anywhere Visa is accepted. Add to Apple Pay or Google Pay on your phone.</p>
      <p><a href="${params.dashboardUrl}" style="color:#1a8fd1;">View card in Stripe Dashboard</a> (requires admin access)</p>
      <p style="color:#aaa;font-size:12px;margin-top:20px;">This is a prototype notification from Legacy.com's sandbox.</p>
    </div></body></html>`;
  await sendMail({ to: params.to, subject: `Your $${params.amountUsd} Legacy Loyalty virtual card`, html });
}
