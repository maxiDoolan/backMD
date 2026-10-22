import { toId, isPopulated } from "./helpers.js";
import { PublicUserDTO } from "./user.dto.js";
import { EventSummaryDTO } from "./event.dto.js";

// Ticket/inscripción para respuestas. Filtra también los documentos populados.
// includeUser: false → se omite el usuario (ej. "mis tickets", donde es el propio).
export class TicketDTO {
    constructor(ticket, { includeUser = true } = {}) {
        this.id = toId(ticket);
        if (includeUser) {
            this.user = isPopulated(ticket.user) ? new PublicUserDTO(ticket.user) : toId(ticket.user);
        }
        this.event = isPopulated(ticket.event) ? new EventSummaryDTO(ticket.event) : toId(ticket.event);
        this.status = ticket.status;
        this.quantity = ticket.quantity;
        this.reservationCode = ticket.reservationCode;
        this.cancelledAt = ticket.cancelledAt ?? null;
        this.createdAt = ticket.createdAt;
        this.updatedAt = ticket.updatedAt;
    }
}
