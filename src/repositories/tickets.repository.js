import { TicketsDAO } from "../dao/tickets.dao.js";

const dao = new TicketsDAO();

// Convierte _id → id, también en los documentos populados
function withId(doc) {
    if (!doc || typeof doc !== "object" || !doc._id) return doc;
    const { _id, __v, ...rest } = doc;
    return { id: _id, ...rest };
}

const toDTO = (ticket) => {
    const { user, event, ...rest } = withId(ticket);
    return { ...rest, user: withId(user), event: withId(event) };
};

export class TicketsRepository {
    async create(ticketData) {
        const created = await dao.create(ticketData);
        return toDTO(created.toObject());
    }

    async findById(id) {
        const ticket = await dao.findById(id);
        return ticket ? toDTO(ticket) : null;
    }

    async findActiveByUserAndEvent(userId, eventId) {
        const ticket = await dao.findActiveByUserAndEvent(userId, eventId);
        return ticket ? toDTO(ticket) : null;
    }

    async sumActiveQuantity(eventId) {
        return dao.sumActiveQuantity(eventId);
    }

    async findByUser(userId) {
        return (await dao.findByUser(userId)).map(toDTO);
    }

    async findByEvent(eventId) {
        return (await dao.findByEvent(eventId)).map(toDTO);
    }

    async update(id, changes) {
        const ticket = await dao.update(id, changes);
        return ticket ? toDTO(ticket) : null;
    }
}
