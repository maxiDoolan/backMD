import { assertCanManageEvent } from "../services/events.service.js";
import { assertCanCancelTicket } from "../services/tickets.service.js";

// Guardias de ruta para recursos propios. La regla (dueño o admin) vive en los
// services; acá solo se invoca antes del controller. Errores: 400 / 403 / 404.

// Evento: admin gestiona cualquiera; organizer solo los suyos. Sirve para /:id y /:eid.
export async function eventOwnership(req, res, next) {
    try {
        await assertCanManageEvent(req.params.id ?? req.params.eid, req.user);
        next();
    } catch (error) {
        next(error);
    }
}

// Ticket: solo su dueño o un admin.
export async function ticketOwnership(req, res, next) {
    try {
        await assertCanCancelTicket(req.params.tid, req.user);
        next();
    } catch (error) {
        next(error);
    }
}
