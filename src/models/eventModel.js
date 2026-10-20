import { Schema, model } from "mongoose";

export const EVENT_STATUS = Object.freeze({
    DRAFT: "draft",         // borrador: solo lo ven su organizador y los admin
    PUBLISHED: "published", // visible para todos
    CANCELLED: "cancelled", // cancelado (no se borra físicamente)
    FINISHED: "finished",   // ya ocurrió
});

const eventSchema = new Schema(
    {
        title:       { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        category:    { type: String, required: true, trim: true, lowercase: true },
        date:        { type: Date, required: true },
        location:    { type: String, required: true, trim: true },
        capacity:    { type: Number, required: true, min: 1 },
        price:       { type: Number, required: true, min: 0 },
        status:      { type: String, enum: Object.values(EVENT_STATUS), default: EVENT_STATUS.DRAFT },
        // Referencia al User que creó el evento (no se embebe el objeto)
        organizer:   { type: Schema.Types.ObjectId, ref: "Users", required: true },
    },
    { timestamps: true }
);

eventSchema.index({ status: 1, category: 1, date: 1 });

export const eventModel = model("Events", eventSchema);
