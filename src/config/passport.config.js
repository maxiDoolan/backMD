import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy } from "passport-jwt";
import { registerUser, validateCredentials } from "../services/sessions.service.js";
import { CurrentUserDTO } from "../dto/user.dto.js";
import { AUTH_COOKIE } from "./cookie.js";
import { env } from "./env.js";

// Las estrategias no contienen reglas de negocio: delegan en sessions.service.
// Un error de negocio (4xx) se pasa a Passport como "fallo" con { status, message },
// y passportCall lo responde en JSON. Un error inesperado va como error (500).
const toPassportResult = (done) => (error) =>
    error.status && error.status < 500
        ? done(null, false, { status: error.status, message: error.message })
        : done(error);

/* ------------------------------------------------------------------ */
/*  Estrategia "register"                                              */
/* ------------------------------------------------------------------ */
const registerStrategy = new LocalStrategy(
    { usernameField: "email", passReqToCallback: true },
    (req, email, password, done) => {
        const { first_name, last_name } = req.body;
        registerUser({ first_name, last_name, email, password })
            .then((user) => done(null, user))
            .catch(toPassportResult(done));
    }
);

/* ------------------------------------------------------------------ */
/*  Estrategia "login": valida credenciales (NO genera el JWT)         */
/* ------------------------------------------------------------------ */
const loginStrategy = new LocalStrategy(
    { usernameField: "email" },
    (email, password, done) => {
        validateCredentials(email, password)
            .then((user) => done(null, user))
            .catch(toPassportResult(done));
    }
);

/* ------------------------------------------------------------------ */
/*  Estrategia "current": lee el JWT de la cookie y lo valida          */
/* ------------------------------------------------------------------ */
const cookieExtractor = (req) => req?.cookies?.[AUTH_COOKIE] ?? null;

const currentStrategy = new JwtStrategy(
    { jwtFromRequest: cookieExtractor, secretOrKey: env.jwtSecret },
    (payload, done) => done(null, new CurrentUserDTO(payload))
);

/* ------------------------------------------------------------------ */
/*  Registro de estrategias                                            */
/*  Para sumar un provider externo (Google, GitHub, etc.) alcanza con  */
/*  crear su estrategia y agregarla acá. app.js no se modifica.        */
/* ------------------------------------------------------------------ */
const strategies = {
    register: registerStrategy,
    login: loginStrategy,
    current: currentStrategy,
    // google: new GoogleStrategy({ ... }, verify),
    // github: new GitHubStrategy({ ... }, verify),
};

export function initializePassport() {
    for (const [name, strategy] of Object.entries(strategies)) {
        passport.use(name, strategy);
    }
    return passport;
}
