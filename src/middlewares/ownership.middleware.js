import { isValidObjectId } from "mongoose";
import { EventsRepository } from "../repositories/events.repository.js";
import { PERMISSIONS } from "../config/roles.js";
import { getPurchasableEvent } from "../services/events.service.js";

const eventsRepository = new EventsRepository();

const isOwner = (event, user) => String(event.organizer) === String(user.id);

// Propiedad del recurso: admin puede modificar cualquier evento; organizer solo los propios.
// 400 si el ID es inválido, 404 si no existe, 403 si es ajeno.
export async function eventOwnership(req, res, next) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ status: "error", message: "ID de evento inválido" });
        }
        const event = await eventsRepository.findById(id);
        if (!event) {
            return res.status(404).json({ status: "error", message: "Evento no encontrado" });
        }

        const canManageAny = PERMISSIONS.MANAGE_ANY_EVENT.includes(req.user.role);
        if (!canManageAny && !isOwner(event, req.user)) {
            return res.status(403).json({ status: "error", message: "Solo podés modificar tus propios eventos" });
        }
        next();
    } catch (error) {
        next(error);
    }
}

// Comprar ticket: el evento debe estar publicado (regla del service) y no ser propio (403)
export async function ticketPermission(req, res, next) {
    try {
        const event = await getPurchasableEvent(req.params.eid);
        if (isOwner(event, req.user)) {
            return res.status(403).json({ status: "error", message: "No podés comprar un ticket de tu propio evento" });
        }
        next();
    } catch (error) {
        next(error);
    }
}
