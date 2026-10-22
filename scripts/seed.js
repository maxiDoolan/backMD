// Carga datos de prueba: usuarios con cada rol y eventos publicados.
// Uso: npm run seed   (se puede correr varias veces: no duplica datos)
import { connectDB, disconnectDB } from "../src/config/db.js";
import { UserRepository } from "../src/repositories/users.repository.js";
import { EventRepository } from "../src/repositories/events.repository.js";
import { ROLES } from "../src/config/roles.js";
import { EVENT_STATUS } from "../src/constants/status.js";
import { hashPassword } from "../src/utils/hash.js";

export const SEED_PASSWORD = "Test1234";

const SEED_USERS = [
    { first_name: "Ada",    last_name: "Admin",      email: "admin@eventos.com",      role: ROLES.ADMIN },
    { first_name: "Oscar",  last_name: "Organizador", email: "organizer@eventos.com",  role: ROLES.ORGANIZER },
    { first_name: "Olga",   last_name: "Organizadora", email: "organizer2@eventos.com", role: ROLES.ORGANIZER },
    { first_name: "Ulises", last_name: "Usuario",    email: "user@eventos.com",       role: ROLES.USER },
    { first_name: "Uma",    last_name: "Usuaria",    email: "user2@eventos.com",      role: ROLES.USER },
];

const daysFromNow = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(19, 0, 0, 0);
    return date;
};

const CATEGORIES = ["workshop", "talk", "concert"];
const LOCATIONS = ["CABA", "Córdoba", "Rosario"];

const SEED_EVENTS = Array.from({ length: 12 }, (_, i) => ({
    title: `${["Taller", "Charla", "Recital"][i % 3]} de prueba ${i + 1}`,
    description: "Evento generado por el seed para probar la API",
    category: CATEGORIES[i % 3],
    location: LOCATIONS[i % 3],
    date: daysFromNow(30 + i * 7),
    capacity: 50,
    price: (i % 3) * 5000,
    status: EVENT_STATUS.PUBLISHED,
}));

async function seedUsers() {
    const userRepository = new UserRepository();
    const password = await hashPassword(SEED_PASSWORD);
    const users = {};

    for (const data of SEED_USERS) {
        const existing = await userRepository.findByEmail(data.email);
        users[data.email] = existing
            ? await userRepository.update(existing._id, { role: data.role, password })
            : await userRepository.create({ ...data, password });
        console.log(`  ${existing ? "actualizado" : "creado     "}  ${data.role.padEnd(9)} ${data.email}`);
    }
    return users;
}

async function seedEvents(organizer) {
    const eventRepository = new EventRepository();
    const { total } = await eventRepository.findEvents({ organizer: organizer._id }, { limit: 1 });
    if (total > 0) {
        console.log(`  el organizador ya tiene ${total} eventos: no se crean nuevos`);
        return;
    }
    for (const event of SEED_EVENTS) {
        await eventRepository.create({ ...event, organizer: organizer._id });
    }
    console.log(`  creados ${SEED_EVENTS.length} eventos publicados de organizer@eventos.com`);
}

try {
    await connectDB();
    console.log("Usuarios de prueba:");
    const users = await seedUsers();
    console.log("Eventos de prueba:");
    await seedEvents(users["organizer@eventos.com"]);
    console.log(`\nListo. Contraseña de todos los usuarios de prueba: ${SEED_PASSWORD}`);
} catch (error) {
    console.error("Error al cargar los datos de prueba:", error.message);
    process.exitCode = 1;
} finally {
    await disconnectDB();
}
