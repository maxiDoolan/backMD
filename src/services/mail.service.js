import { transporter, isMailConfigured } from "../config/mailer.js";
import { env } from "../config/env.js";

// Escapa texto que viene del usuario antes de meterlo en el HTML del mail
const escapeHtml = (text) =>
    String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const formatDate = (date) =>
    new Date(date).toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

// Envía el email de confirmación de inscripción.
// Devuelve true/false: un fallo de mail NO debe deshacer la inscripción.
export async function sendTicketConfirmation({ to, ticket, event }) {
    if (!isMailConfigured) return false;
    try {
        await transporter.sendMail({
            from: env.mail.from,
            to,
            subject: `Inscripción confirmada: ${event.title}`,
            text: [
                `¡Tu inscripción a "${event.title}" está confirmada!`,
                ``,
                `Código de reserva: ${ticket.reservationCode}`,
                `Cantidad de entradas: ${ticket.quantity}`,
                `Fecha: ${formatDate(event.date)}`,
                `Lugar: ${event.location}`,
            ].join("\n"),
            html: `
                <h2>¡Inscripción confirmada!</h2>
                <p>Tu inscripción a <strong>${escapeHtml(event.title)}</strong> está confirmada.</p>
                <ul>
                    <li><strong>Código de reserva:</strong> ${ticket.reservationCode}</li>
                    <li><strong>Entradas:</strong> ${ticket.quantity}</li>
                    <li><strong>Fecha:</strong> ${formatDate(event.date)}</li>
                    <li><strong>Lugar:</strong> ${escapeHtml(event.location)}</li>
                </ul>
                <p>Presentá el código de reserva el día del evento.</p>`,
        });
        return true;
    } catch (error) {
        console.error("Error enviando email de confirmación:", error.message);
        return false;
    }
}
