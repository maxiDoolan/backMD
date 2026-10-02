import passport from "passport";

// Ejecuta una estrategia de Passport sin sesiones y responde en JSON si falla.
// - Si la estrategia rechaza con { status, message }, se usa eso.
// - Si Passport rechaza solo (sin token, token inválido/expirado, campos
//   faltantes), se responde con el status de Passport o 401 genérico.( me tiraba muchos errores de token por eso lo dejee en asi me volvi loco jjaja, )
export function passportCall(strategy, { failMessage = "No autenticado" } = {}) {
    return (req, res, next) => {
        passport.authenticate(
            strategy,
            { session: false, badRequestMessage: "Faltan campos obligatorios" },
            (error, user, info, status) => {
                if (error) return next(error);
                if (!user) {
                    const code = info?.status ?? status ?? 401;
                    const message = info?.status ? info.message : code === 400 ? info?.message : failMessage;
                    return res.status(code).json({ status: "error", message });
                }
                req.user = user;
                next();
            }
        )(req, res, next);
    };
}
