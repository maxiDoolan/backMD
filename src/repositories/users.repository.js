import { UserDAO } from "../dao/users.dao.js";

// Repository de usuarios: métodos orientados al dominio sobre el UserDAO.
// No importa modelos. Devuelve objetos planos; los DTO se aplican en los services.
export class UserRepository {
    constructor(dao = new UserDAO()) {
        this.dao = dao;
    }

    findAll() {
        return this.dao.find({});
    }

    findById(id) {
        return this.dao.findById(id);
    }

    findByEmail(email) {
        return this.dao.findOne({ email });
    }

    // Solo para validar credenciales: incluye el hash de la contraseña
    findByEmailWithPassword(email) {
        return this.dao.findOne({ email }, { select: "+password" });
    }

    create(userData) {
        return this.dao.create(userData);
    }
}
