import { isValidObjectId } from "mongoose";
import { EventsRepository } from "../repositories/events.repository.js";
import { TicketsRepository } from "../repositories/tickets.repository.js";
import { PERMISSIONS } from "../config/roles.js";

const eventsRepository = new EventsRepository();
const ticketsRepository = new TicketsRepository();

const sameId = (a, b) => String(a?.id ?? a) === String(b);

// Propiedad de eventos: admin puede cualquiera; organizer solo los propios.
// Sirve para /:id y para /:eid. 400 ID inválido, 404 no existe, 403 ajeno.
export async function eventOwnership(req, res, next) {
    try {
        const id = req.params.id ?? req.params.eid;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ status: "error", message: "ID de evento inválido" });
        }
        const event = await eventsRepository.findById(id);
        if (!event) {
            return res.status(404).json({ status: "error", message: "Evento no encontrado" });
        }

        const canManageAny = PERMISSIONS.MANAGE_ANY_EVENT.includes(req.user.role);
        if (!canManageAny && !sameId(event.organizer, req.user.id)) {
            return res.status(403).json({ status: "error", message: "Solo podés gestionar tus propios eventos" });
        }
        next();
    } catch (error) {
        next(error);
    }
}

// Propiedad de tickets: el dueño del ticket o un admin. 400 / 404 / 403.
export async function ticketOwnership(req, res, next) {
    try {
        const { tid } = req.params;
        if (!isValidObjectId(tid)) {
            return res.status(400).json({ status: "error", message: "ID de ticket inválido" });
        }
        const ticket = await ticketsRepository.findById(tid);
        if (!ticket) {
            return res.status(404).json({ status: "error", message: "Ticket no encontrado" });
        }

        const canManageAny = PERMISSIONS.CANCEL_ANY_TICKET.includes(req.user.role);
        if (!canManageAny && !sameId(ticket.user, req.user.id)) {
            return res.status(403).json({ status: "error", message: "Solo podés cancelar tus propios tickets" });
        }
        next();
    } catch (error) {
        next(error);
    }
}
