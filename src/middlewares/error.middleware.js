// Formato único de error en toda la API: { status: "error", message }
//   400 datos inválidos · 401 no autenticado · 403 sin permisos
//   404 no encontrado   · 409 conflicto       · 500 error interno

// Rutas inexistentes → 404 en JSON (en vez del HTML por defecto de Express)
export function notFoundHandler(req, res) {
    res.status(404).json({ status: "error", message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
    // Errores de negocio lanzados por los services (HttpError)
    if (error.status && error.status < 500 && !error.type) {
        return res.status(error.status).json({ status: "error", message: error.message });
    }
    // Body con JSON mal formado (lo lanza express.json())
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ status: "error", message: "JSON inválido" });
    }
    // Datos que no cumplen el schema de Mongoose o IDs mal formados
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ status: "error", message: "Datos inválidos", details: error.message });
    }
    // Clave única duplicada (ej. carrera entre dos registros con el mismo email)
    if (error.code === 11000) {
        return res.status(409).json({ status: "error", message: "El recurso ya existe" });
    }
    // Error inesperado: se registra para depurar y no se exponen detalles al cliente
    console.error(error);
    res.status(500).json({ status: "error", message: "Error interno del servidor" });
}
