import passport from "passport";
import { passportCall } from "./passport.middleware.js";

// Autenticación obligatoria: lee el JWT de la cookie currentUser (estrategia "current"),
// lo valida y deja { id, email, role } en req.user.
// Sin cookie o con token inválido/expirado → 401 "No autenticado".
export const auth = passportCall("current");

// Autenticación opcional (rutas públicas): si hay sesión válida carga req.user,
// si no, sigue igual sin error. Sirve para mostrarle sus borradores al organizer.
export function optionalAuth(req, res, next) {
    passport.authenticate("current", { session: false }, (error, user) => {
        if (user) req.user = user;
        next();
    })(req, res, next);
}
