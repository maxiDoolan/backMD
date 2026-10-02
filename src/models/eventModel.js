import { Schema, model } from "mongoose";

export const EVENT_STATUS = Object.freeze({
    ACTIVE: "active",       // publicado
    CANCELLED: "cancelled", // cancelado por su organizador o un admin
});

const eventSchema = new Schema({
    name:      { type: String, required: true, trim: true },
    date:      { type: Date, required: true },
    place:     { type: String, required: true, trim: true },
    capacity:  { type: Number, required: true, min: 1 },
    price:     { type: Number, required: true, min: 0 },
    status:    { type: String, enum: Object.values(EVENT_STATUS), default: EVENT_STATUS.ACTIVE },
    // Usuario (organizer o admin) que creó el evento
    organizer: { type: Schema.Types.ObjectId, ref: "Users", required: true },
});

export const eventModel = model("Events", eventSchema);
