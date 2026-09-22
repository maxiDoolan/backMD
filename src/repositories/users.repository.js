import { UsersDAO } from "../dao/users.dao.js";

const dao = new UsersDAO();

// Repository: abstrae el DAO y decide qué datos devolver hacia arriba
export class UsersRepository {
    async findByEmail(email) {
        return dao.findByEmail(email);
    }

    async create(userData) {
        const created = await dao.create(userData);
        // Destrucuramos password, __v y _id para no exponerlos ni duplicarlos
        const { password, __v, _id, ...safeUser } = created.toObject();
        // Devolvemos id limpio (sin guión bajo) como pide el spec
        return { id: _id, ...safeUser };
    }
}
