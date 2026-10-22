import { toId } from "./helpers.js";

// Usuario completo para respuestas (registro, listado de admin). Nunca incluye password.
export class UserDTO {
    constructor(user) {
        this.id = toId(user);
        this.first_name = user.first_name;
        this.last_name = user.last_name;
        this.email = user.email;
        this.role = user.role;
    }
}

// Usuario autenticado (/current y payload del JWT): solo lo mínimo
export class CurrentUserDTO {
    constructor(user) {
        this.id = toId(user);
        this.email = user.email;
        this.role = user.role;
    }
}

// Datos públicos de un usuario cuando viene populado dentro de otro documento
export class PublicUserDTO {
    constructor(user) {
        this.id = toId(user);
        this.first_name = user.first_name;
        this.last_name = user.last_name;
        this.email = user.email;
    }
}
