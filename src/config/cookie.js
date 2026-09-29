import { env } from "./env.js";

export const AUTH_COOKIE = "currentUser";

// Opciones compartidas para setear y borrar la cookie (deben coincidir)
const baseOptions = {
    httpOnly: true,           // JS del navegador no puede leerla
    sameSite: "lax",
    secure: env.isProduction, // solo HTTPS en producción
};

export const authCookieOptions = { ...baseOptions, maxAge: 3600000 }; // 1 hora
export const clearAuthCookieOptions = baseOptions;
