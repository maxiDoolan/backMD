import { EventsRepository } from "../repositories/events.repository.js";

const eventsRepository = new EventsRepository();

// Campos que se pueden enviar en el body (organizer y status no)
const EDITABLE_FIELDS = ["name", "date", "place", "capacity", "price"];

function pickEditable(body = {}) {
    return Object.fromEntries(
        EDITABLE_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]])
    );
}

// Cualquier usuario logueado: eventos publicados
export async function getAllEvents(req, res, next) {
    try {
        const events = await eventsRepository.findPublished();
        res.status(200).json({ status: "success", payload: events });
    } catch (error) {
        next(error);
    }
}

// Cualquier usuario logueado
export async function getEventById(req, res, next) {
    try {
        const event = await eventsRepository.findById(req.params.eid);
        if (!event) {
            return res.status(404).json({ status: "error", message: "Evento no encontrado" });
        }
        res.status(200).json({ status: "success", payload: event });
    } catch (error) {
        next(error);
    }
}

// organizer / admin. El organizer sale del token, no del body
export async function createEvent(req, res, next) {
    try {
        const newEvent = await eventsRepository.create({
            ...pickEditable(req.body),
            organizer: req.user.id,
        });
        res.status(201).json({ status: "success", payload: newEvent });
    } catch (error) {
        next(error);
    }
}

// organizer (solo propios) / admin (cualquiera) — lo valida eventOwnership
export async function updateEvent(req, res, next) {
    try {
        const changes = pickEditable(req.body);
        if (Object.keys(changes).length === 0) {
            return res.status(400).json({ status: "error", message: "No hay campos para actualizar" });
        }
        const updated = await eventsRepository.update(req.params.eid, changes);
        res.status(200).json({ status: "success", payload: updated });
    } catch (error) {
        next(error);
    }
}

// Cancelar (baja lógica: status "cancelled") — lo valida eventOwnership
export async function deleteEvent(req, res, next) {
    try {
        const cancelled = await eventsRepository.cancel(req.params.eid);
        res.status(200).json({ status: "success", message: "Evento cancelado", payload: cancelled });
    } catch (error) {
        next(error);
    }
}
