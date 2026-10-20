import { Types } from "mongoose";
import { ticketModel, ACTIVE_TICKET_STATUSES } from "../models/ticketModel.js";

// DAO: única capa que toca directamente el modelo de tickets
export class TicketsDAO {
    async create(ticketData) {
        return ticketModel.create(ticketData);
    }

    async findById(id) {
        return ticketModel.findById(id, "-__v").lean();
    }

    async findActiveByUserAndEvent(userId, eventId) {
        return ticketModel
            .findOne({ user: userId, event: eventId, status: { $in: ACTIVE_TICKET_STATUSES } }, "-__v")
            .lean();
    }

    // Suma de quantity de los tickets activos de un evento (los cancelados no cuentan)
    async sumActiveQuantity(eventId) {
        const [result] = await ticketModel.aggregate([
            { $match: { event: new Types.ObjectId(String(eventId)), status: { $in: ACTIVE_TICKET_STATUSES } } },
            { $group: { _id: null, total: { $sum: "$quantity" } } },
        ]);
        return result?.total ?? 0;
    }

    // Tickets de un usuario con datos públicos del evento
    async findByUser(userId) {
        return ticketModel
            .find({ user: userId }, "-__v")
            .sort({ createdAt: -1 })
            .populate("event", "title date location status")
            .lean();
    }

    // Inscriptos de un evento con datos básicos del usuario (nunca password)
    async findByEvent(eventId) {
        return ticketModel
            .find({ event: eventId }, "-__v")
            .sort({ createdAt: 1 })
            .populate("user", "first_name last_name email")
            .lean();
    }

    async update(id, changes) {
        return ticketModel.findByIdAndUpdate(id, changes, { new: true, runValidators: true }).select("-__v").lean();
    }
}
