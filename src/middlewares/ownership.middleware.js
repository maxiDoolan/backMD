import { isValidObjectId } from "mongoose";
import { EventsRepository } from "../repositories/events.repository.js";
import { PERMISSIONS } from "../config/roles.js";

const eventsRepository = new EventsRepository();

const isOwner = (event, user) => String(event.organizer) === String(user.id);

// Busca el evento de :eid (400 si el ID es inválido, 404 si no existe) y lo deja en req.event
async function loadEvent(req, res) {
    const { eid } = req.params;
    if (!isValidObjectId(eid)) {
        res.status(400).json({ status: "error", message: "ID de evento inválido" });
        return null;
    }
    const event = await eventsRepository.findById(eid);
    if (!event) {
        res.status(404).json({ status: "error", message: "Evento no encontrado" });
        return null;
    }
    req.event = event;
    return event;
}

// Modificar/cancelar: admin puede cualquier evento; organizer solo los propios → si no, 403
export async function eventOwnership(req, res, next) {
    try {
        const event = await loadEvent(req, res);
        if (!event) return;

        const canManageAny = PERMISSIONS.MANAGE_ANY_EVENT.includes(req.user.role);
        if (!canManageAny && !isOwner(event, req.user)) {
            return res.status(403).json({ status: "error", message: "Solo podés modificar tus propios eventos" });
        }
        next();
    } catch (error) {
        next(error);
    }
}

// Comprar ticket: cualquier rol, pero nadie puede comprar en un evento que organiza → 403
export async function ticketPermission(req, res, next) {
    try {
        const event = await loadEvent(req, res);
        if (!event) return;

        if (isOwner(event, req.user)) {
            return res.status(403).json({ status: "error", message: "No podés comprar un ticket de tu propio evento" });
        }
        next();
    } catch (error) {
        next(error);
    }
}
