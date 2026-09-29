import { env } from "./config/env.js";
import app from "./app.js";
import { connectDB } from "./config/db.js";

try {
    await connectDB();
    console.log("Conectado a MongoDB");
    app.listen(env.port, () => {
        console.log(`Servidor corriendo en puerto ${env.port}`);
    });
} catch (error) {
    console.error("Error conectando a MongoDB:", error.message);
    process.exit(1);
}
