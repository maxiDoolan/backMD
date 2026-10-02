// Autorización por rol. Recibe los roles permitidos y los compara contra req.user.role.
// Va SIEMPRE después de auth (que carga req.user).
//   - sin req.user        → 401 (no hay sesión)
//   - rol no permitido    → 403 (hay sesión pero no tiene permiso)
export function authorize(...allowedRoles) {
    const roles = allowedRoles.flat();
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: "error", message: "No autenticado" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ status: "error", message: "No tenés permisos para realizar esta acción" });
        }
        next();
    };
}
