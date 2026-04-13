import nodemailer from 'nodemailer';
import { env } from '../config/env';

// ── Transporter (reutilizable) ──────────────────────────────
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false, // TLS via STARTTLS en puerto 587
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ── Variables que se pueden usar en los emails ───────────────
export interface EmailVariables {
  nombre?: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  fuente?: string;
  [key: string]: string | undefined;
}

// ── Reemplazar variables {{nombre}} en el HTML/texto ─────────
function interpolate(template: string, vars: EmailVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

// ── Enviar email con soporte de variables ────────────────────
export async function sendEmail(params: {
  to: string;
  subject: string;
  bodyHtml: string;
  variables?: EmailVariables;
}): Promise<{ messageId: string }> {
  const { to, bodyHtml, variables = {} } = params;

  const subject = interpolate(params.subject, variables);
  const html = interpolate(bodyHtml, variables);

  // Texto plano como fallback (quitar tags HTML)
  const text = html.replace(/<[^>]*>/g, '').trim();

  const info = await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });

  console.log(`[Email] ✅ Enviado a ${to} — MessageId: ${info.messageId}`);
  return { messageId: info.messageId };
}

// ── Verificar conexión SMTP ──────────────────────────────────
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('[Email] ✅ Conexión SMTP verificada');
    return true;
  } catch (error: any) {
    console.error('[Email] ❌ Error SMTP:', error.message);
    return false;
  }
}
