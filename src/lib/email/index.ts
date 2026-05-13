import { promises as fs } from 'fs';
import { join } from 'path';

const EMAILS_OUTBOX = './emails_outbox';

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // Already exists
  }
}

async function saveToOutbox(filename: string, html: string) {
  await ensureDir(EMAILS_OUTBOX);
  const path = join(EMAILS_OUTBOX, filename);
  await fs.writeFile(path, html);
}

function generateHtmlEmail(subject: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1e3a5f; color: white; padding: 20px; }
    .header h1 { margin: 0; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { padding: 20px; background-color: #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Prescribe Tu Multa</h1>
    </div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      <p>© 2026 Prescribe Tu Multa. Todos los derechos reservados.</p>
      <p>Contacto: contacto@prescribetumulta.cl</p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendClientAnalysisReceipt(data: {
  name: string;
  email: string;
  requestId: string;
}) {
  const html = generateHtmlEmail(
    'Certificado de Recibimiento - Prescribe Tu Multa',
    `
    <p>¡Hola ${data.name}!</p>
    <p>Recibimos tu certificado de multas de tránsito con éxito.</p>
    <p><strong>Referencia de solicitud:</strong> ${data.requestId}</p>
    <p>Nuestro sistema está analizando tu certificado. Te enviaremos los resultados preliminares en pocos momentos.</p>
    <p>Saludos,<br/>El equipo de Prescribe Tu Multa</p>
    `
  );

  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@prescribetumulta.cl',
          to: data.email,
          subject: 'Certificado de Recibimiento - Prescribe Tu Multa',
          html: html,
        }),
      });
    } catch (e) {
      console.error('Error sending receipt email:', e);
      await saveToOutbox(`receipt_${data.requestId}_${Date.now()}.html`, html);
    }
  } else {
    await saveToOutbox(`receipt_${data.requestId}_${Date.now()}.html`, html);
  }
}

export async function sendClientAnalysisResults(data: {
  name: string;
  email: string;
  requestId: string;
  prescribedCount: number;
  totalCount: number;
}) {
  const html = generateHtmlEmail(
    'Resultados Preliminares - Prescribe Tu Multa',
    `
    <p>¡Hola ${data.name}!</p>
    <p>Tu análisis ha sido completado. Aquí están los resultados preliminares:</p>
    <ul>
      <li><strong>Total de multas:</strong> ${data.totalCount}</li>
      <li><strong>Multas posiblemente prescritas:</strong> ${data.prescribedCount}</li>
    </ul>
    ${data.prescribedCount > 0 ? `
    <p>¡Buenas noticias! Encontramos ${data.prescribedCount} multa(s) que podrían estar prescrita(s).</p>
    <p>Puedes comprar un informe completo con documentos listos para presentar en tribunal.</p>
    ` : `
    <p>No encontramos multas prescritas en tu certificado.</p>
    `}
    <p>Accede a tus resultados completos con tu referencia: <strong>${data.requestId}</strong></p>
    <p>Saludos,<br/>El equipo de Prescribe Tu Multa</p>
    `
  );

  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@prescribetumulta.cl',
          to: data.email,
          subject: 'Resultados Preliminares - Prescribe Tu Multa',
          html: html,
        }),
      });
    } catch (e) {
      console.error('Error sending results email:', e);
      await saveToOutbox(`results_${data.requestId}_${Date.now()}.html`, html);
    }
  } else {
    await saveToOutbox(`results_${data.requestId}_${Date.now()}.html`, html);
  }
}

export async function sendClientPaymentConfirmed(data: {
  name: string;
  email: string;
  requestId: string;
  amount: number;
}) {
  const html = generateHtmlEmail(
    'Pago Confirmado - Prescribe Tu Multa',
    `
    <p>¡Hola ${data.name}!</p>
    <p>Hemos recibido tu pago de $${data.amount.toLocaleString('es-CL')} exitosamente.</p>
    <p><strong>Referencia de solicitud:</strong> ${data.requestId}</p>
    <p>Estamos generando tus documentos. Los recibirás en pocos momentos.</p>
    <p>Saludos,<br/>El equipo de Prescribe Tu Multa</p>
    `
  );

  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@prescribetumulta.cl',
          to: data.email,
          subject: 'Pago Confirmado - Prescribe Tu Multa',
          html: html,
        }),
      });
    } catch (e) {
      console.error('Error sending payment confirmation email:', e);
      await saveToOutbox(`payment_${data.requestId}_${Date.now()}.html`, html);
    }
  } else {
    await saveToOutbox(`payment_${data.requestId}_${Date.now()}.html`, html);
  }
}

export async function sendClientResultsReady(data: {
  name: string;
  email: string;
  requestId: string;
  downloadUrl: string;
}) {
  const html = generateHtmlEmail(
    'Documentos Listos - Prescribe Tu Multa',
    `
    <p>¡Hola ${data.name}!</p>
    <p>Tus documentos están listos para descargar.</p>
    <p><strong>Referencia de solicitud:</strong> ${data.requestId}</p>
    <p><a href="https://prescribetumulta.cl${data.downloadUrl}" style="background-color: #1e3a5f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Descargar Documentos</a></p>
    <p>Incluye:</p>
    <ul>
      <li>Informe de prescripción detallado</li>
      <li>Solicitudes por tribunal</li>
    </ul>
    <p><strong>Importante:</strong> Consulta con un abogado antes de presentar las solicitudes.</p>
    <p>Saludos,<br/>El equipo de Prescribe Tu Multa</p>
    `
  );

  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@prescribetumulta.cl',
          to: data.email,
          subject: 'Documentos Listos - Prescribe Tu Multa',
          html: html,
        }),
      });
    } catch (e) {
      console.error('Error sending results ready email:', e);
      await saveToOutbox(`ready_${data.requestId}_${Date.now()}.html`, html);
    }
  } else {
    await saveToOutbox(`ready_${data.requestId}_${Date.now()}.html`, html);
  }
}

export async function sendAdminNotification(data: {
  requestId: string;
  name: string;
  email: string;
  plate: string;
  totalFines: number;
  prescribedCount: number;
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@prescribetumulta.cl';
  const html = generateHtmlEmail(
    'Nueva Solicitud de Análisis',
    `
    <p>Nueva solicitud de análisis recibida:</p>
    <ul>
      <li><strong>ID:</strong> ${data.requestId}</li>
      <li><strong>Cliente:</strong> ${data.name} (${data.email})</li>
      <li><strong>Patente:</strong> ${data.plate}</li>
      <li><strong>Multas totales:</strong> ${data.totalFines}</li>
      <li><strong>Posiblemente prescritas:</strong> ${data.prescribedCount}</li>
    </ul>
    `
  );

  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@prescribetumulta.cl',
          to: adminEmail,
          subject: `Nueva solicitud: ${data.requestId}`,
          html: html,
        }),
      });
    } catch (e) {
      console.error('Error sending admin notification:', e);
      await saveToOutbox(`admin_${data.requestId}_${Date.now()}.html`, html);
    }
  } else {
    await saveToOutbox(`admin_${data.requestId}_${Date.now()}.html`, html);
  }
}

