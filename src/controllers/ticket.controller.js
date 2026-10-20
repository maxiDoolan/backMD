import { TicketsRepository } from "../repositories/tickets.repository.js";
import { notImplemented } from "./notImplemented.js";

const ticketsRepository = new TicketsRepository();

// ticketPermission ya validó que el evento existe, está publicado y no es propio
export async function purchaseTicket(req, res, next) {
    try {
        const { uid, eid } = req.params;
        const newTicket = await ticketsRepository.create({ user: uid, event: eid });
        res.status(201).json({ status: "success", payload: newTicket });
    } catch (error) {
        next(error);
    }
}

export const getAll = notImplemented;
export const getAllById = notImplemented;
