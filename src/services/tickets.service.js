import { randomBytes } from "node:crypto";
import { TicketRepository } from "../repositories/tickets.repository.js";
import { EventRepository } from "../repositories/events.repository.js";
import { TICKET_STATUS, EVENT_STATUS } from "../constants/status.js";
import { PERMISSIONS } from "../config/roles.js";
import { TicketDTO } from "../dto/ticket.dto.js";
import { EventDTO } from "../dto/event.dto.js";
import { HttpError } from "../utils/errors.js";
import { isValidId } from "../utils/validators.js";
import { sendTicketConfirmation } from "./mail.service.js";

const ticketRepository = new TicketRepository();
const eventRepository = new EventRepository();

// Regla del proyecto: una inscripción activa por usuario y evento
// (dentro de esa inscripción se pueden pedir varias entradas con quantity).
const MAX_QUANTITY_PER_TICKET = 10;

const generateReservationCode = () => `TCK-${randomBytes(4).toString("hex").toUpperCase()}`;

function parseQuantity(value) {
    if (value === undefined) return 1; // por defecto, 1 entrada
    const quantity = Number(value);
    if (value === null || value === "" || typeof value === "boolean" || !Number.isInteger(quantity) || quantity <= 0) {
        throw new HttpError(400, "La cantidad (quantity) debe ser un número entero mayor a 0");
    }
    if (quantity > MAX_QUANTITY_PER_TICKET) {
        throw new HttpError(400, `No se pueden pedir más de ${MAX_QUANTITY_PER_TICKET} entradas por inscripción`);
    }
    return quantity;
}

async function findEventOrFail(eventId) {
    if (!isValidId(eventId)) throw new HttpError(400, "ID de evento inválido");
    const event = await eventRepository.findById(eventId);
    if (!event) throw new HttpError(404, "Evento no encontrado");
    return event;
}

// Cupos del evento: solo cuentan los tickets activos (confirmed / pending)
async function getAvailability(event) {
    const reserved = await ticketRepository.countActiveTickets(event._id);
    return { capacity: event.capacity, reserved, available: Math.max(event.capacity - reserved, 0) };
}

/* ------------------------------------------------------------------ */
/*  POST /api/events/:eid/tickets — inscripción                        */
/* ------------------------------------------------------------------ */
export async function enroll(eventId, body = {}, user) {
    const quantity = parseQuantity(body.quantity);

    // 1. El evento existe
    const event = await findEventOrFail(eventId);

    // 2-3. Está publicado (no borrador, cancelado ni finalizado) y no pasó su fecha
    if (event.status === EVENT_STATUS.CANCELLED) throw new HttpError(409, "El evento está cancelado");
    if (event.status === EVENT_STATUS.FINISHED) throw new HttpError(409, "El evento ya finalizó");
    if (event.status !== EVENT_STATUS.PUBLISHED) throw new HttpError(409, "El evento todavía no está publicado");
    if (new Date(event.date) <= new Date()) throw new HttpError(409, "El evento ya ocurrió");

    // El organizador no se inscribe a su propio evento
    if (String(event.organizer) === String(user.id)) {
        throw new HttpError(403, "No podés inscribirte a tu propio evento");
    }

    // 4. Sin inscripción activa duplicada
    const existing = await ticketRepository.findActiveByUserAndEvent(user.id, event._id);
    if (existing) {
        throw new HttpError(409, `Ya tenés una inscripción activa para este evento (código ${existing.reservationCode})`);
    }

    // 5. Cupo suficiente
    const { available } = await getAvailability(event);
    if (quantity > available) {
        throw new HttpError(
            409,
            available === 0
                ? "No hay cupos disponibles para este evento"
                : `No hay cupo suficiente: pediste ${quantity} y quedan ${available}`
        );
    }

    const ticket = await ticketRepository.create({
        user: user.id,
        event: event._id,
        quantity,
        status: TICKET_STATUS.CONFIRMED,
        reservationCode: generateReservationCode(),
    });

    // 6. Email de confirmación (si falla, la inscripción igual queda guardada)
    const emailSent = await sendTicketConfirmation({ to: user.email, ticket, event: new EventDTO(event) });

    return { ticket: new TicketDTO(ticket), emailSent };
}

/* ------------------------------------------------------------------ */
/*  GET /api/tickets/my-tickets                                         */
/* ------------------------------------------------------------------ */
export async function getMyTickets(user) {
    const tickets = await ticketRepository.findByUser(user.id);
    // Son del propio usuario: se omite el campo user; el evento va resumido por el DTO
    return tickets.map((ticket) => new TicketDTO(ticket, { includeUser: false }));
}

/* ------------------------------------------------------------------ */
/*  GET /api/events/:eid/tickets (organizer del evento o admin)         */
/* ------------------------------------------------------------------ */
export async function getEventTickets(eventId) {
    const event = await findEventOrFail(eventId);
    const [tickets, availability] = await Promise.all([
        ticketRepository.findByEvent(event._id),
        getAvailability(event),
    ]);
    return {
        event: { id: String(event._id), title: event.title, status: event.status, ...availability },
        tickets: tickets.map((ticket) => new TicketDTO(ticket)),
    };
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/tickets/:tid/cancel                                     */
/*  (que sea el dueño del ticket o un admin lo valida assertCanCancelTicket) */
/* ------------------------------------------------------------------ */
async function findTicketOrFail(ticketId) {
    if (!isValidId(ticketId)) throw new HttpError(400, "ID de ticket inválido");
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw new HttpError(404, "Ticket no encontrado");
    return ticket;
}

export async function cancelTicket(ticketId) {
    const ticket = await findTicketOrFail(ticketId);
    if (ticket.status === TICKET_STATUS.CANCELLED) throw new HttpError(409, "El ticket ya está cancelado");

    // No se elimina: cambia el estado y registra la fecha. El cupo se libera
    // solo, porque los tickets cancelados no se cuentan en countActiveTickets.
    return new TicketDTO(await ticketRepository.cancelTicket(ticketId));
}

// Permiso sobre recurso propio: el dueño del ticket o un admin.
// Lo usa el middleware ticketOwnership antes de cancelar.
export async function assertCanCancelTicket(ticketId, user) {
    const ticket = await findTicketOrFail(ticketId);
    const canManageAny = PERMISSIONS.CANCEL_ANY_TICKET.includes(user?.role);
    if (!canManageAny && String(ticket.user) !== String(user?.id)) {
        throw new HttpError(403, "Solo podés cancelar tus propios tickets");
    }
    return ticket;
}
