import { hashPassword } from "../utils/hash.js";
import { UsersRepository } from "../repositories/users.repository.js";

const usersRepository = new UsersRepository();

export async function registerUser(userData) {
    const { first_name, last_name, email, password } = userData;

    // 1. Validar presencia de campos obligatorios
    if (!first_name || !last_name || !email || !password) {
        throw new Error("Faltan campos obligatorios");
    }

    // 2. Normalizar email PRIMERO: trim + lowercase (antes de validar formato)
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Validar formato de email con regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
        throw new Error("Formato de email inválido");
    }

    // 4. Validar longitud mínima de contraseña
    if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
    }

    // 5. Verificar si el email ya existe
    const existingUser = await usersRepository.findByEmail(normalizedEmail);
    if (existingUser) {
        throw new Error("El email ya está registrado");
    }

    // 6. Hashear la contraseña (bcrypt, async)
    const hashed = await hashPassword(password);

    // 7. Guardar en la base de datos (el role NO viene del body, siempre "user")
    const newUser = await usersRepository.create({
        first_name,
        last_name,
        email: normalizedEmail,
        password: hashed,
        role: "user",
    });

    return newUser;
}
