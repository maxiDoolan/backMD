import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy } from "passport-jwt";
import { UsersRepository } from "../repositories/users.repository.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { AUTH_COOKIE } from "./cookie.js";
import { env } from "./env.js";
import { ROLES } from "./roles.js";

const usersRepository = new UsersRepository();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_CREDENTIALS = "Credenciales inválidas";

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const normalizeEmail = (email) => email.trim().toLowerCase();

// El 3er argumento de done(null, false, info) llega al middleware passportCall,
// que responde con info.status y info.message.
const reject = (done, status, message) => done(null, false, { status, message });

/* ------------------------------------------------------------------ */
/*  Estrategia "register": validación, normalización, unicidad, bcrypt */
/* ------------------------------------------------------------------ */
const registerStrategy = new LocalStrategy(
    { usernameField: "email", passReqToCallback: true },
    async (req, email, password, done) => {
        try {
            const { first_name, last_name } = req.body;

            if (![first_name, last_name, email, password].every(isNonEmptyString)) {
                return reject(done, 400, "Faltan campos obligatorios");
            }

            const normalizedEmail = normalizeEmail(email);
            if (!EMAIL_REGEX.test(normalizedEmail)) {
                return reject(done, 400, "Formato de email inválido");
            }

            if (password.length < 6) {
                return reject(done, 400, "La contraseña debe tener al menos 6 caracteres");
            }

            const existingUser = await usersRepository.findByEmail(normalizedEmail);
            if (existingUser) {
                return reject(done, 409, "El email ya está registrado");
            }

            // El role NO se toma del body: siempre "user"
            const newUser = await usersRepository.create({
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                email: normalizedEmail,
                password: await hashPassword(password),
                role: ROLES.USER,
            });

            return done(null, newUser); // ya viene sin password desde el repository
        } catch (error) {
            return done(error);
        }
    }
);

/* ------------------------------------------------------------------ */
/*  Estrategia "login": valida credenciales (NO genera el JWT)         */
/* ------------------------------------------------------------------ */
const loginStrategy = new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
        try {
            if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
                return reject(done, 400, "Faltan campos obligatorios");
            }

            const user = await usersRepository.findByEmail(normalizeEmail(email));
            // Mismo mensaje si el email no existe o si la contraseña no coincide
            if (!user || !(await comparePassword(password, user.password))) {
                return reject(done, 401, INVALID_CREDENTIALS);
            }

            // Solo lo necesario para el token; nunca la password
            return done(null, { id: user._id.toString(), email: user.email, role: user.role });
        } catch (error) {
            return done(error);
        }
    }
);

/* ------------------------------------------------------------------ */
/*  Estrategia "current": lee el JWT de la cookie y lo valida          */
/* ------------------------------------------------------------------ */
const cookieExtractor = (req) => req?.cookies?.[AUTH_COOKIE] ?? null;

const currentStrategy = new JwtStrategy(
    { jwtFromRequest: cookieExtractor, secretOrKey: env.jwtSecret },
    (payload, done) => {
        const { id, email, role } = payload;
        return done(null, { id, email, role });
    }
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
