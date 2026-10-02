import { eventModel } from "../models/eventModel.js";

// Campos del organizador que se exponen al hacer populate (nunca password)
const ORGANIZER_FIELDS = "first_name last_name email role";

export class EventsDAO {
    async findAll(filter = {}) {
        return eventModel.find(filter, "-__v").populate("organizer", ORGANIZER_FIELDS).lean();
    }

    async findById(id) {
        return eventModel.findById(id, "-__v").lean();
    }

    async create(eventData) {
        return eventModel.create(eventData);
    }

    async update(id, changes) {
        return eventModel.findByIdAndUpdate(id, changes, { new: true, runValidators: true }).select("-__v").lean();
    }
}
