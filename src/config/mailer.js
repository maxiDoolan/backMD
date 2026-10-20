import nodemailer from "nodemailer";
import { env } from "./env.js";

const { host, port, user, pass } = env.mail;

export const isMailConfigured = Boolean(host && user && pass);

if (!isMailConfigured) {
    console.warn("⚠️  Email no configurado (MAIL_HOST / MAIL_USER / MAIL_PASS): no se enviarán notificaciones.");
}

// Transporter único de Nodemailer; credenciales siempre desde variables de entorno
export const transporter = isMailConfigured
    ? nodemailer.createTransport({
          host,
          port,
          secure: port === 465, // 465 = SSL; 587 = STARTTLS
          auth: { user, pass },
      })
    : null;
