import { userModel } from "../models/userModel.js";
import { BaseDAO } from "./base.dao.js";

export class UserDAO extends BaseDAO {
    constructor() {
        super(userModel);
    }
}
