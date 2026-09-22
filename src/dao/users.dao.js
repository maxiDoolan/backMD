import { userModel } from "../models/userModel.js";

// DAO: única capa que toca directamente la base de datos
export class UsersDAO {
    async findByEmail(email) {
        return userModel.findOne({ email });
    }

    async create(userData) {
        return userModel.create(userData);
    }
}
