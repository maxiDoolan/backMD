import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";


dns.setServers(["1.1.1.1", "8.8.8.8"]);

export async function connectDB() {
    await mongoose.connect(env.mongoUrl);
}

export async function disconnectDB() {
    await mongoose.disconnect();
}
