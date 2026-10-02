import { UsersRepository } from "../repositories/users.repository.js";
import { notImplemented } from "./notImplemented.js";

const usersRepository = new UsersRepository();

// Solo admin (lo controla authorize en el router)
export async function getAll(req, res, next) {
    try {
        const users = await usersRepository.findAll();
        res.status(200).json({ status: "success", payload: users });
    } catch (error) {
        next(error);
    }
}

export const getAllByEmail = notImplemented;
export const updateEmail = notImplemented;
