import { Schema, model } from "mongoose";

export const TICKET_STATUS = Object.freeze({
    CONFIRMED: "confirmed", // inscripción confirmada (ocupa cupo)
    PENDING: "pending",     // reservada a confirmar, ej. pago pendiente (ocupa cupo)
    CANCELLED: "cancelled", // cancelada (NO ocupa cupo)
});

// Estados que ocupan cupo y cuentan como "inscripción activa"
export const ACTIVE_TICKET_STATUSES = [TICKET_STATUS.CONFIRMED, TICKET_STATUS.PENDING];

const ticketSchema = new Schema(
    {
        // Solo referencias: nunca se embebe el usuario ni el evento
        user:            { type: Schema.Types.ObjectId, ref: "Users", required: true },
        event:           { type: Schema.Types.ObjectId, ref: "Events", required: true },
        status:          { type: String, enum: Object.values(TICKET_STATUS), default: TICKET_STATUS.CONFIRMED },
        quantity:        { type: Number, required: true, min: 1 },
        reservationCode: { type: String, required: true, unique: true },
        cancelledAt:     { type: Date, default: null },
    },
    { timestamps: true } // createdAt / updatedAt
);

ticketSchema.index({ event: 1, status: 1 });
ticketSchema.index({ user: 1, event: 1 });

export const ticketModel = model("Tickets", ticketSchema);
