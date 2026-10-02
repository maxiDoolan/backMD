import { passportCall } from "./passport.middleware.js";

// Autenticación: lee el JWT de la cookie currentUser (estrategia "current"),
// lo valida y deja { id, email, role } en req.user.
// Sin cookie o con token inválido/expirado → 401 "No autenticado".
export const auth = passportCall("current");
