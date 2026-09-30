import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

// Algunos DNS de proveedores/Windows no resuelven registros SRV (mongodb+srv://).
// Usamos DNS públicos para evitar el error "querySrv ECONNREFUSED".
dns.setServers(["1.1.1.1", "8.8.8.8"]);

export async function connectDB() {
    await mongoose.connect(env.mongoUrl);
}
