import { ticketModel } from "../models/ticketModel.js";
import { BaseDAO } from "./base.dao.js";

export class TicketDAO extends BaseDAO {
    constructor() {
        super(ticketModel);
    }
}
