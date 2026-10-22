import * as usersService from "../services/users.service.js";

// Solo admin (lo controla authorize en el router)
export async function getAll(req, res, next) {
    try {
        const users = await usersService.listUsers();
        res.status(200).json({ status: "success", payload: users });
    } catch (error) {
        next(error);
    }
}
