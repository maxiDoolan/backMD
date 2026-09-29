// Respuesta para endpoints todavía no desarrollados (evita requests colgados)
export function notImplemented(req, res) {
    res.status(501).json({ status: "error", message: "Endpoint no implementado todavía" });
}
