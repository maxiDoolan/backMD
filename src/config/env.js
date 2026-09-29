import { config } from "dotenv";
config();

// Variables sin las cuales la app no puede arrancar
const required = ["MONGO_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
}

export const env = {
    port: process.env.PORT || 3000,
    mongoUrl: process.env.MONGO_URL,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
};
