import { createClient } from "@supabase/supabase-js";

export type ClientPaymentConfirmedEmailData = {
  name?: string | null;
  email: string;
  requestId: string;
  amount?: number | string | null;
};

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
  metadata?: Record<string, unknown>;
};

export type EmailSendResult = {
  ok: boolean;
  provider: "resend" | "emails_outbox" | "none";
  id?: string | null;
  outbox?: boolean;
  error?: string;
};

const SUPPORT_EMAIL =
  process.env.EMAIL_SUPPORT?.trim() ||
  process.env.SUPPORT_EMAIL?.trim() ||
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
  "contacto@prescribetumulta.cl";

const DEFAULT_AMOUNT = 9990;

function getEmailFrom(): string {
  const from = process.env.EMAIL_FROM?.trim();

  if (from) {
    return from;
  }

  return `Prescribe tu Multa <${SUPPORT_EMAIL}>`;
}

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function cleanName(name?: string | null): string {
  const value = String(name || "").trim();
  return value.length > 0 ? value : "cliente";
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(
      value
        .replace(/[^\d.,-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    );

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return DEFAULT_AMOUNT;
}

function formatCLP(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function buildPaymentConfirmedEmail(data: ClientPaymentConfirmedEmailData): EmailPayload {
  const name = cleanName(data.name);
  const email = normalizeEmail(data.email);
  const requestId = String(data.requestId || "").trim();
  const amount = formatCLP(data.amount);

  const safeName = escapeHtml(name);
  const safeRequestId = escapeHtml(requestId);
  const safeAmount = escapeHtml(amount);
  const safeSupportEmail = escapeHtml(SUPPORT_EMAIL);

  const subject = "Compra confirmada - Prescribe tu Multa";

  const text = [
    `Hola ${name},`,
    "",
    "Tu compra fue confirmada correctamente.",
    "",
    `N° de solicitud: ${requestId}`,
    `Monto pagado: ${amount}`,
    "",
    "Próximos pasos:",
    "1. Procesaremos la información asociada a tu solicitud.",
    "2. Prepararemos el informe de análisis y los borradores correspondientes, según el producto contratado.",
    "3. Te enviaremos la información al correo registrado.",
    "",
    "Importante:",
    "- Revisa también tu bandeja de spam, promociones o correo no deseado.",
    `- Si no recibes novedades o tienes dudas, escríbenos a ${SUPPORT_EMAIL} indicando tu N° de solicitud.`,
    "- Este correo no contiene enlaces directos de descarga por seguridad.",
    "",
    "Disclaimer legal:",
    "Este producto corresponde a un análisis jurídico y/o documentación de apoyo. No garantiza un resultado favorable ni la eliminación automática de multas. La decisión final depende del tribunal competente, de los antecedentes del caso y de la tramitación que corresponda.",
    "",
    "Prescribe tu Multa",
  ].join("\n");

  const html = `
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#0f766e;padding:28px 30px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;opacity:.9;">Prescribe tu Multa</div>
                <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">Compra confirmada</h1>
                <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#ccfbf1;">Recibimos correctamente tu pago.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
                  Hola <strong>${safeName}</strong>, tu compra fue confirmada correctamente.
                </p>

                <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="margin:20px 0;border-collapse:separate;border-spacing:0;border:1px solid #dbe4ee;border-radius:14px;overflow:hidden;">
                  <tr>
                    <td style="padding:14px 16px;background:#f8fafc;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;">N° de solicitud</td>
                    <td style="padding:14px 16px;background:#f8fafc;font-size:14px;color:#0f172a;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">${safeRequestId}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;color:#475569;">Monto pagado</td>
                    <td style="padding:14px 16px;font-size:16px;color:#0f172a;text-align:right;font-weight:800;">${safeAmount} CLP</td>
                  </tr>
                </table>

                <div style="margin:24px 0;padding:18px;border-radius:14px;background:#ecfdf5;border:1px solid #bbf7d0;">
                  <h2 style="margin:0 0 10px;font-size:17px;color:#065f46;">Próximos pasos</h2>
                  <ol style="margin:0;padding-left:20px;color:#064e3b;font-size:14px;line-height:1.7;">
                    <li>Procesaremos la información asociada a tu solicitud.</li>
                    <li>Prepararemos el informe de análisis y los borradores correspondientes, según el producto contratado.</li>
                    <li>Te enviaremos la información al correo registrado.</li>
                  </ol>
                </div>

                <div style="margin:24px 0;padding:18px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;">
                  <h2 style="margin:0 0 10px;font-size:17px;color:#9a3412;">Importante</h2>
                  <ul style="margin:0;padding-left:20px;color:#7c2d12;font-size:14px;line-height:1.7;">
                    <li>Revisa también tu bandeja de spam, promociones o correo no deseado.</li>
                    <li>Si no recibes novedades o tienes dudas, escríbenos a <strong>${safeSupportEmail}</strong> indicando tu N° de solicitud.</li>
                    <li>Este correo no contiene enlaces directos de descarga por seguridad.</li>
                  </ul>
                </div>

                <div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                  <h2 style="margin:0 0 8px;font-size:15px;color:#334155;">Disclaimer legal</h2>
                  <p style="margin:0;font-size:13px;line-height:1.7;color:#475569;">
                    Este producto corresponde a un análisis jurídico y/o documentación de apoyo. No garantiza un resultado favorable ni la eliminación automática de multas. La decisión final depende del tribunal competente, de los antecedentes del caso y de la tramitación que corresponda.
                  </p>
                </div>

                <p style="margin:26px 0 0;font-size:14px;line-height:1.7;color:#475569;">Gracias por confiar en Prescribe tu Multa.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">Prescribe tu Multa · Contacto: ${safeSupportEmail}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    to: email,
    subject,
    html,
    text,
    type: "payment_confirmation",
    metadata: {
      requestId,
      amount: toNumber(data.amount),
      customerEmail: email,
      customerName: name,
    },
  };
}
async function sendViaResend(payload: EmailPayload): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return {
      ok: false,
      provider: "none",
      error: "RESEND_API_KEY no configurada.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFrom(),
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    const result: any = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        provider: "resend",
        error: result?.message || result?.error || `Resend respondió HTTP ${response.status}.`,
      };
    }

    return {
      ok: true,
      provider: "resend",
      id: result?.id || null,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "resend",
      error: error instanceof Error ? error.message : "Error desconocido enviando por Resend.",
    };
  }
}

async function saveToOutbox(payload: EmailPayload, reason: string): Promise<EmailSendResult> {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    return {
      ok: false,
      provider: "none",
      error: "No se pudo usar emails_outbox porque faltan variables Supabase de servidor.",
    };
  }

  const now = new Date().toISOString();

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const rows: Array<Record<string, unknown>> = [
    {
      to_email: payload.to,
      from_email: getEmailFrom(),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      status: "pending",
      type: payload.type,
      provider: "emails_outbox",
      error: reason,
      metadata: payload.metadata || {},
      created_at: now,
      updated_at: now,
    },
    {
      to_email: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      status: "pending",
      type: payload.type,
      metadata: payload.metadata || {},
      created_at: now,
    },
    {
      email: payload.to,
      subject: payload.subject,
      body: payload.html,
      status: "pending",
      metadata: payload.metadata || {},
      created_at: now,
    },
  ];

  let lastError = "";

  for (const row of rows) {
    const { error } = await supabase.from("emails_outbox").insert(row);

    if (!error) {
      return {
        ok: true,
        provider: "emails_outbox",
        outbox: true,
      };
    }

    lastError = error.message;
  }

  return {
    ok: false,
    provider: "none",
    error: lastError || "No se pudo guardar el correo en emails_outbox.",
  };
}

async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  const resendResult = await sendViaResend(payload);

  if (resendResult.ok) {
    return resendResult;
  }

  const outboxResult = await saveToOutbox(
    payload,
    resendResult.error || "Resend no disponible."
  );

  if (outboxResult.ok) {
    return outboxResult;
  }

  console.error("[PTM_EMAIL_ERROR]", {
    to: payload.to,
    subject: payload.subject,
    resendError: resendResult.error,
    outboxError: outboxResult.error,
  });

  return {
    ok: false,
    provider: "none",
    error: outboxResult.error || resendResult.error || "No se pudo enviar ni guardar el correo.",
  };
}

export async function sendClientPaymentConfirmed(
  data: ClientPaymentConfirmedEmailData
): Promise<EmailSendResult> {
  const email = normalizeEmail(data.email);

  if (!email || !email.includes("@")) {
    return {
      ok: false,
      provider: "none",
      error: "Email de destinatario inválido.",
    };
  }

  if (!data.requestId || String(data.requestId).trim().length === 0) {
    return {
      ok: false,
      provider: "none",
      error: "requestId requerido para correo de confirmación.",
    };
  }

  return sendEmail(
    buildPaymentConfirmedEmail({
      ...data,
      email,
    })
  );
}

export async function sendPaymentConfirmationEmail(
  data: ClientPaymentConfirmedEmailData
): Promise<EmailSendResult> {
  return sendClientPaymentConfirmed(data);
}

export async function sendClientPurchaseConfirmed(
  data: ClientPaymentConfirmedEmailData
): Promise<EmailSendResult> {
  return sendClientPaymentConfirmed(data);
}
