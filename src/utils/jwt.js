import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Firma un JWT con información mínima del usuario (nunca la contraseña)
export function generateToken({ id, email, role }) {
    return jwt.sign({ id: String(id), email, role }, env.jwtSecret, {
        expiresIn: env.jwtExpiresIn,
    });
}

// Verifica firma y expiración. Lanza error si el token es inválido o expiró
export function verifyToken(token) {
    return jwt.verify(token, env.jwtSecret);
}
