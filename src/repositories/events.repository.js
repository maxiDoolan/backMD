import { EventsDAO } from "../dao/events.dao.js";
import { EVENT_STATUS } from "../models/eventModel.js";

const dao = new EventsDAO();

const toDTO = ({ _id, __v, ...event }) => ({ id: _id, ...event });

export class EventsRepository {
    // Eventos publicados (no cancelados)
    async findPublished() {
        const events = await dao.findAll({ status: EVENT_STATUS.ACTIVE });
        return events.map(toDTO);
    }

    async findById(id) {
        const event = await dao.findById(id);
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

    async cancel(id) {
        return this.update(id, { status: EVENT_STATUS.CANCELLED });
    }
}
