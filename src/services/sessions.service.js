import { UserRepository } from "../repositories/users.repository.js";
import { ROLES } from "../config/roles.js";
import { UserDTO, CurrentUserDTO } from "../dto/user.dto.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { HttpError } from "../utils/errors.js";
import { isNonEmptyString } from "../utils/validators.js";

const userRepository = new UserRepository();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_CREDENTIALS = "Credenciales inválidas";

const normalizeEmail = (email) => email.trim().toLowerCase();

// Registro: validación, normalización, unicidad, bcrypt y rol por defecto.
// Lo invoca la estrategia "register" de Passport.
export async function registerUser({ first_name, last_name, email, password } = {}) {
    if (![first_name, last_name, email, password].every(isNonEmptyString)) {
        throw new HttpError(400, "Faltan campos obligatorios");
    }

    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw new HttpError(400, "Formato de email inválido");
    }

    if (password.length < 6) {
        throw new HttpError(400, "La contraseña debe tener al menos 6 caracteres");
    }

    if (await userRepository.findByEmail(normalizedEmail)) {
        throw new HttpError(409, "El email ya está registrado");
    }

    // El role NO se toma del body: siempre "user"
    const user = await userRepository.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: normalizedEmail,
        password: await hashPassword(password),
        role: ROLES.USER,
    });

    return new UserDTO(user);
}

// Login: valida credenciales. Mismo mensaje si el email no existe o la contraseña no coincide.
// Lo invoca la estrategia "login" de Passport. NO genera el JWT (eso es del controller).
export async function validateCredentials(email, password) {
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
        throw new HttpError(400, "Faltan campos obligatorios");
    }

    const user = await userRepository.findByEmailWithPassword(normalizeEmail(email));
    if (!user || !(await comparePassword(password, user.password))) {
        throw new HttpError(401, INVALID_CREDENTIALS);
    }

    return new CurrentUserDTO(user); // { id, email, role }: lo que va en el token
}
