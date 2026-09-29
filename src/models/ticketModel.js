import { Schema, model } from "mongoose";

const ticketSchema = new Schema({
    user:  { type: Schema.Types.ObjectId, ref: "Users" },
    event: { type: Schema.Types.ObjectId, ref: "Events" },
});

export const ticketModel = model("Tickets", ticketSchema);
