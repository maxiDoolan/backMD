import { hashPassword, comparePassword } from "../utils/hash.js";
import { UsersRepository } from "../repositories/users.repository.js";
import { HttpError } from "../utils/errors.js";

const usersRepository = new UsersRepository();

const INVALID_CREDENTIALS = "Credenciales inválidas";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
}

export async function registerUser(userData = {}) {
    const { first_name, last_name, email, password } = userData;

    // 1. Validar presencia (y tipo) de campos obligatorios
    if (![first_name, last_name, email, password].every(isNonEmptyString)) {
        throw new HttpError(400, "Faltan campos obligatorios");
    }

    // 2. Normalizar email: trim + lowercase (antes de validar formato)
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Validar formato de email
    if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw new HttpError(400, "Formato de email inválido");
    }

    // 4. Validar longitud mínima de contraseña
    if (password.length < 6) {
        throw new HttpError(400, "La contraseña debe tener al menos 6 caracteres");
    }

    // 5. Verificar si el email ya existe
    const existingUser = await usersRepository.findByEmail(normalizedEmail);
    if (existingUser) {
        throw new HttpError(409, "El email ya está registrado");
    }

    // 6. Hashear la contraseña
    const hashed = await hashPassword(password);

    // 7. Guardar (el role NO viene del body, siempre "user")
    return usersRepository.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: normalizedEmail,
        password: hashed,
        role: "user",
    });
}

export async function loginUser(credentials = {}) {
    const { email, password } = credentials;

    // 1. Validar presencia de email y password
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
        throw new HttpError(400, "Faltan campos obligatorios");
    }

    // 2. Buscar usuario por email normalizado
    const user = await usersRepository.findByEmail(email.trim().toLowerCase());

    // 3. Mismo mensaje si no existe el email o si la contraseña no coincide
    if (!user) {
        throw new HttpError(401, INVALID_CREDENTIALS);
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
        throw new HttpError(401, INVALID_CREDENTIALS);
    }

    // 4. Devolver solo lo necesario para el token (sin password)
    return { id: user._id.toString(), email: user.email, role: user.role };
}
