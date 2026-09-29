import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// Hashea una contraseña en texto plano
export async function hashPassword(plainPassword) {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// Compara una contraseña en texto plano con un hash guardado
export async function comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
}
