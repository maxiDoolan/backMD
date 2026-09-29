import { verifyToken } from "../utils/jwt.js";
import { AUTH_COOKIE } from "../config/cookie.js";

// Lee la cookie, verifica el JWT y deja el payload en req.user
export function auth(req, res, next) {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) {
        return res.status(401).json({ status: "error", message: "No autenticado" });
    }

    try {
        const { id, email, role } = verifyToken(token);
        req.user = { id, email, role };
        next();
    } catch {
        // Token manipulado, mal formado o expirado
        return res.status(401).json({ status: "error", message: "No autenticado" });
    }
}
