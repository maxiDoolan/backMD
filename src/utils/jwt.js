import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Firma un JWT con información mínima del usuario (nunca la contraseña).
// La verificación la hace la estrategia "current" de Passport (passport-jwt).
export function generateToken({ id, email, role }) {
    return jwt.sign({ id: String(id), email, role }, env.jwtSecret, {
        expiresIn: env.jwtExpiresIn,
    });
}
