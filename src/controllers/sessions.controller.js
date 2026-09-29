import { registerUser, loginUser } from "../services/sessions.service.js";
import { generateToken } from "../utils/jwt.js";
import { AUTH_COOKIE, authCookieOptions, clearAuthCookieOptions } from "../config/cookie.js";

// Traduce errores conocidos (HttpError) a su status; el resto es 500
function handleError(res, error) {
    if (error.status) {
        return res.status(error.status).json({ status: "error", message: error.message });
    }
    console.error(error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor" });
}

export async function registerController(req, res) {
    try {
        const user = await registerUser(req.body ?? {});
        res.status(201).json({ status: "success", payload: user });
    } catch (error) {
        handleError(res, error);
    }
}

export async function loginController(req, res) {
    try {
        const user = await loginUser(req.body ?? {});
        const token = generateToken(user);
        res.cookie(AUTH_COOKIE, token, authCookieOptions);
        res.status(200).json({ status: "success", message: "Login correcto" });
    } catch (error) {
        handleError(res, error);
    }
}

export function currentController(req, res) {
    // req.user lo carga el middleware auth: { id, email, role }
    res.status(200).json({ status: "success", payload: req.user });
}

export function logoutController(req, res) {
    res.clearCookie(AUTH_COOKIE, clearAuthCookieOptions);
    res.status(200).json({ status: "success", message: "Sesión cerrada" });
}
