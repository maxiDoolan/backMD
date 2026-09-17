import {schema, model} from "mongoose";

const ticketSchema = new schema({
    user:{
        type: schema.Types.ObjectId,
        ref: "Users",
    },
    event:{
        type: schema.Types.ObjectId,
        ref: "Events",},
});

export const ticketModel = model("Tickets", ticketSchema);