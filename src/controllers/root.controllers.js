export function healtstatus(req, res) {
    res.status(200).json({ status: "ok", message: "Servidor activo" });
}
