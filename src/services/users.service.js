import { UserRepository } from "../repositories/users.repository.js";
import { UserDTO } from "../dto/user.dto.js";

const userRepository = new UserRepository();

// GET /api/users (solo admin): lista de usuarios sin password
export async function listUsers() {
    const users = await userRepository.findAll();
    return users.map((user) => new UserDTO(user));
}
