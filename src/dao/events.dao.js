import { eventModel } from "../models/eventModel.js";
import { BaseDAO } from "./base.dao.js";

export class EventDAO extends BaseDAO {
    constructor() {
        super(eventModel);
    }
}
