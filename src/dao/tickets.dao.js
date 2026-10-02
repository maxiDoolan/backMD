import { ticketModel } from "../models/ticketModel.js";

export class TicketsDAO {
    async create(ticketData) {
        return ticketModel.create(ticketData);
    }
}
