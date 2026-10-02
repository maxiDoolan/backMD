import { TicketsDAO } from "../dao/tickets.dao.js";

const dao = new TicketsDAO();

export class TicketsRepository {
    async create(ticketData) {
        const { _id, __v, ...ticket } = (await dao.create(ticketData)).toObject();
        return { id: _id, ...ticket };
    }
}
