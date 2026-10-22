import { generateToken } from "../utils/jwt.js";
import { AUTH_COOKIE, authCookieOptions, clearAuthCookieOptions } from "../config/cookie.js";

// Los controllers de sesión solo arman la respuesta: la validación la hacen
// sessions.service (vía estrategias de Passport) y los DTO ya vienen en req.user.

// req.user = UserDTO del usuario creado (estrategia "register")
export function registerController(req, res) {
    res.status(201).json({ status: "success", payload: req.user });
}

// req.user = CurrentUserDTO { id, email, role } (estrategia "login").
// El controller (no la estrategia) genera el JWT y setea la cookie.
export function loginController(req, res) {
    const token = generateToken(req.user);
    res.cookie(AUTH_COOKIE, token, authCookieOptions);
    res.status(200).json({ status: "success", message: "Login correcto" });
}

// req.user = CurrentUserDTO { id, email, role } (estrategia "current")
export function currentController(req, res) {
    res.status(200).json({ status: "success", payload: req.user });
}

// No pasa por Passport: solo borra la cookie
export function logoutController(req, res) {
    res.clearCookie(AUTH_COOKIE, clearAuthCookieOptions);
    res.status(200).json({ status: "success", message: "Sesión cerrada" });
}
