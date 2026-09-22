import { registerUser } from "../services/sessions.service.js";

export async function registerController(req, res) {
    try {
        const user = await registerUser(req.body);
        res.status(201).json({ status: "success", payload: user });

    } catch (error) {
        // Email duplicado → 409 Conflict
        if (error.message === "El email ya está registrado") {
            return res.status(409).json({ status: "error", message: error.message });
        }
        // Validaciones → 400 Bad Request
        const validationErrors = [
            "Faltan campos obligatorios",
            "Formato de email inválido",
            "La contraseña debe tener al menos 6 caracteres",
        ];
        if (validationErrors.includes(error.message)) {
            return res.status(400).json({ status: "error", message: error.message });
        }
        // Error inesperado → 500
        res.status(500).json({ status: "error", message: "Error interno del servidor" });
    }
}
