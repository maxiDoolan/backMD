// Manejador global de errores (siempre responde JSON)
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
    // Body con JSON mal formado (lo lanza express.json())
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ status: "error", message: "JSON inválido" });
    }
    // Datos que no cumplen el schema de Mongoose o IDs mal formados
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ status: "error", message: "Datos inválidos", details: error.message });
    }
    console.error(error);
    res.status(500).json({ status: "error", message: "Error interno del servidor" });
}
