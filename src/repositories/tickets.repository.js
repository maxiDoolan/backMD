import { TicketDAO } from "../dao/tickets.dao.js";
import { ACTIVE_TICKET_STATUSES, TICKET_STATUS } from "../constants/status.js";

// Datos que se piden de los documentos relacionados (nunca password)
const WITH_EVENT = { path: "event", select: "title date location status" };
const WITH_USER = { path: "user", select: "first_name last_name email" };

// Repository de tickets: métodos orientados al dominio sobre el TicketDAO.
export class TicketRepository {
    constructor(dao = new TicketDAO()) {
        this.dao = dao;
    }

    findById(id) {
        return this.dao.findById(id);
    }

    findActiveByUserAndEvent(userId, eventId) {
        return this.dao.findOne({ user: userId, event: eventId, status: { $in: ACTIVE_TICKET_STATUSES } });
    }

    // Cupos ocupados: suma de quantity de los tickets activos (los cancelados no cuentan)
    countActiveTickets(eventId) {
        return this.dao.sum({ event: eventId, status: { $in: ACTIVE_TICKET_STATUSES } }, "quantity");
    }

    findByUser(userId) {
        return this.dao.find({ user: userId }, { sort: { createdAt: -1 }, populate: WITH_EVENT });
    }

    findByEvent(eventId) {
        return this.dao.find({ event: eventId }, { sort: { createdAt: 1 }, populate: WITH_USER });
    }

    create(ticketData) {
        return this.dao.create(ticketData);
    }

    // Cancelar = cambiar estado y registrar la fecha (nunca se elimina)
    cancelTicket(id) {
        return this.dao.update(id, { status: TICKET_STATUS.CANCELLED, cancelledAt: new Date() });
    }
}
