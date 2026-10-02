import { UsersDAO } from "../dao/users.dao.js";

const dao = new UsersDAO();

// Repository: abstrae el DAO y decide qué datos devolver hacia arriba
export class UsersRepository {
    async findAll() {
        const users = await dao.findAll(); // ya vienen sin password
        return users.map(({ _id, ...user }) => ({ id: _id, ...user }));
    }

    // Uso interno (login/registro): devuelve el documento completo
    async findByEmail(email) {
        return dao.findByEmail(email);
    }

    async create(userData) {
        const created = await dao.create(userData);
        // Sacamos password, __v y _id para no exponerlos ni duplicarlos
        const { password, __v, _id, ...safeUser } = created.toObject();
        return { id: _id, ...safeUser };
    }
}
