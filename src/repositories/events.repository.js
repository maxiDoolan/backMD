import { EventsDAO } from "../dao/events.dao.js";

const dao = new EventsDAO();

// Normaliza el documento: _id → id (también en el organizer populado)
function toDTO({ _id, __v, organizer, ...event }) {
    const org = organizer && organizer._id
        ? { id: organizer._id, ...Object.fromEntries(Object.entries(organizer).filter(([k]) => k !== "_id")) }
        : organizer;
    return { id: _id, ...event, organizer: org };
}

export class EventsRepository {
    async findPaginated(filter, options) {
        const [events, total] = await Promise.all([dao.findPaginated(filter, options), dao.count(filter)]);
        return { events: events.map(toDTO), total };
    }

    async findById(id, options) {
        const event = await dao.findById(id, options);
        return event ? toDTO(event) : null;
    }

    async create(eventData) {
        const created = await dao.create(eventData);
        return toDTO(created.toObject());
    }

    async update(id, changes) {
        const updated = await dao.update(id, changes);
        return updated ? toDTO(updated) : null;
    }
}
