import { EventDAO } from "../dao/events.dao.js";
import { EVENT_STATUS } from "../constants/status.js";

// Del organizador populado solo se piden datos públicos (nunca password)
const WITH_ORGANIZER = { path: "organizer", select: "first_name last_name email" };

// Repository de eventos: métodos orientados al dominio sobre el EventDAO.
export class EventRepository {
    constructor(dao = new EventDAO()) {
        this.dao = dao;
    }

    findById(id) {
        return this.dao.findById(id);
    }

    findByIdWithOrganizer(id) {
        return this.dao.findById(id, { populate: WITH_ORGANIZER });
    }

    // Búsqueda paginada con filtros: devuelve la página y el total
    async findEvents(filter, { sort, skip, limit }) {
        const [events, total] = await Promise.all([
            this.dao.find(filter, { sort, skip, limit, populate: WITH_ORGANIZER }),
            this.dao.count(filter),
        ]);
        return { events, total };
    }

    findPublishedEvents(options = {}) {
        return this.findEvents({ status: EVENT_STATUS.PUBLISHED }, { sort: { date: 1 }, ...options });
    }

    create(eventData) {
        return this.dao.create(eventData);
    }

    update(id, changes) {
        return this.dao.update(id, changes);
    }

    updateStatus(id, status) {
        return this.dao.update(id, { status });
    }
}
