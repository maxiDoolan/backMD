import { eventModel } from "../models/eventModel.js";

// Campos del organizador que se exponen al hacer populate (nunca password)
const ORGANIZER_FIELDS = "first_name last_name email";

// DAO: única capa que toca directamente el modelo de eventos
export class EventsDAO {
    async findPaginated(filter, { sort, skip, limit }) {
        return eventModel
            .find(filter, "-__v")
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("organizer", ORGANIZER_FIELDS)
            .lean();
    }

    async count(filter) {
        return eventModel.countDocuments(filter);
    }

    async findById(id, { populate = false } = {}) {
        const query = eventModel.findById(id, "-__v");
        if (populate) query.populate("organizer", ORGANIZER_FIELDS);
        return query.lean();
    }

    async create(eventData) {
        return eventModel.create(eventData);
    }

    async update(id, changes) {
        return eventModel
            .findByIdAndUpdate(id, changes, { new: true, runValidators: true })
            .select("-__v")
            .lean();
    }
}
