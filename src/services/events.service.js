import { isValidObjectId } from "mongoose";
import { EventsRepository } from "../repositories/events.repository.js";
import { EVENT_STATUS } from "../models/eventModel.js";
import { ROLES } from "../config/roles.js";
import { HttpError } from "../utils/errors.js";

const eventsRepository = new EventsRepository();

/* ------------------------------------------------------------------ */
/*  Reglas de negocio                                                  */
/* ------------------------------------------------------------------ */

// Transiciones de estado permitidas. cancelled y finished son estados finales.
const STATUS_TRANSITIONS = Object.freeze({
    [EVENT_STATUS.DRAFT]:     [EVENT_STATUS.PUBLISHED, EVENT_STATUS.CANCELLED],
    [EVENT_STATUS.PUBLISHED]: [EVENT_STATUS.CANCELLED, EVENT_STATUS.FINISHED],
    [EVENT_STATUS.CANCELLED]: [],
    [EVENT_STATUS.FINISHED]:  [],
});

// Estados en los que el evento ya no se puede modificar
const LOCKED_STATUSES = [EVENT_STATUS.CANCELLED, EVENT_STATUS.FINISHED];

// Campos que se pueden enviar al crear/editar (organizer y status nunca vienen del body)
const EDITABLE_FIELDS = ["title", "description", "category", "date", "location", "capacity", "price"];
const REQUIRED_TEXT_FIELDS = ["title", "description", "category", "location"];

// Listado
const SORTABLE_FIELDS = ["date", "price", "title", "capacity", "createdAt"];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const isAdmin = (user) => user?.role === ROLES.ADMIN;
const organizerId = (event) => String(event.organizer?.id ?? event.organizer);
const isOwner = (event, user) => Boolean(user) && organizerId(event) === String(user.id);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function pickEditable(body = {}) {
    return Object.fromEntries(
        EDITABLE_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]])
    );
}

function parseDate(value, field) {
    const date = new Date(value);
    if (value === null || value === "" || Number.isNaN(date.getTime())) {
        throw new HttpError(400, `La fecha "${field}" no es válida`);
    }
    return date;
}

// Valida los campos de un evento. En "partial" (edición) solo valida los que vienen.
function validateEventData(data, { partial = false } = {}) {
    for (const field of REQUIRED_TEXT_FIELDS) {
        if (partial && data[field] === undefined) continue;
        if (typeof data[field] !== "string" || data[field].trim() === "") {
            throw new HttpError(400, `El campo "${field}" es obligatorio`);
        }
    }

    if (!partial || data.date !== undefined) {
        if (data.date === undefined) throw new HttpError(400, 'El campo "date" es obligatorio');
        const date = parseDate(data.date, "date");
        if (date <= new Date()) {
            throw new HttpError(400, "La fecha del evento no puede ser pasada");
        }
        data.date = date;
    }

    if (!partial || data.capacity !== undefined) {
        const capacity = Number(data.capacity);
        if (data.capacity === null || data.capacity === "" || !Number.isInteger(capacity) || capacity <= 0) {
            throw new HttpError(400, "La capacidad debe ser un número entero mayor a 0");
        }
        data.capacity = capacity;
    }

    if (!partial || data.price !== undefined) {
        const price = Number(data.price);
        if (data.price === null || data.price === "" || !Number.isFinite(price) || price < 0) {
            throw new HttpError(400, "El precio debe ser un número mayor o igual a 0");
        }
        data.price = price;
    }

    return data;
}

// Qué eventos puede ver cada uno: los borradores solo su organizador o un admin
function visibilityFilter(user) {
    if (isAdmin(user)) return {};
    if (user?.role === ROLES.ORGANIZER) {
        return { $or: [{ status: { $ne: EVENT_STATUS.DRAFT } }, { organizer: user.id }] };
    }
    return { status: { $ne: EVENT_STATUS.DRAFT } };
}

function parsePositiveInt(value, field, fallback) {
    if (value === undefined || value === "") return fallback;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) {
        throw new HttpError(400, `"${field}" debe ser un número entero mayor a 0`);
    }
    return number;
}

function parseSort(sort = "date") {
    const descending = sort.startsWith("-");
    const field = descending ? sort.slice(1) : sort;
    if (!SORTABLE_FIELDS.includes(field)) {
        throw new HttpError(400, `No se puede ordenar por "${field}". Opciones: ${SORTABLE_FIELDS.join(", ")}`);
    }
    return { [field]: descending ? -1 : 1, _id: 1 };
}

function assertValidId(id) {
    if (!isValidObjectId(id)) throw new HttpError(400, "ID de evento inválido");
}

async function findEventOrFail(id, options) {
    assertValidId(id);
    const event = await eventsRepository.findById(id, options);
    if (!event) throw new HttpError(404, "Evento no encontrado");
    return event;
}

/* ------------------------------------------------------------------ */
/*  Casos de uso                                                       */
/* ------------------------------------------------------------------ */

// GET /api/events — filtros, paginación y ordenamiento
export async function listEvents(query = {}, user) {
    const { status, category, location, dateFrom, dateTo, sort } = query;
    const filters = [visibilityFilter(user)];

    if (status !== undefined) {
        if (!Object.values(EVENT_STATUS).includes(status)) {
            throw new HttpError(400, `Estado inválido. Opciones: ${Object.values(EVENT_STATUS).join(", ")}`);
        }
        filters.push({ status });
    }
    if (category) filters.push({ category: String(category).trim().toLowerCase() });
    if (location) filters.push({ location: { $regex: escapeRegex(String(location).trim()), $options: "i" } });

    if (dateFrom || dateTo) {
        const range = {};
        if (dateFrom) range.$gte = parseDate(dateFrom, "dateFrom");
        if (dateTo) range.$lte = parseDate(dateTo, "dateTo");
        if (range.$gte && range.$lte && range.$gte > range.$lte) {
            throw new HttpError(400, '"dateFrom" no puede ser posterior a "dateTo"');
        }
        filters.push({ date: range });
    }

    const page = parsePositiveInt(query.page, "page", 1);
    const limit = Math.min(parsePositiveInt(query.limit, "limit", DEFAULT_LIMIT), MAX_LIMIT);
    const filter = { $and: filters };

    const { events, total } = await eventsRepository.findPaginated(filter, {
        sort: parseSort(sort),
        skip: (page - 1) * limit,
        limit,
    });

    return { data: events, page, limit, total, totalPages: Math.ceil(total / limit) };
}

// GET /api/events/:id — los borradores ajenos se responden como inexistentes
export async function getEvent(id, user) {
    const event = await findEventOrFail(id, { populate: true });
    if (event.status === EVENT_STATUS.DRAFT && !isAdmin(user) && !isOwner(event, user)) {
        throw new HttpError(404, "Evento no encontrado");
    }
    return event;
}

// POST /api/events — el organizer sale del usuario logueado, nunca del body
export async function createEvent(body, user) {
    const data = validateEventData(pickEditable(body));
    return eventsRepository.create({ ...data, organizer: user.id });
}

// PUT /api/events/:id — no se puede modificar un evento cancelado o finalizado.
// (Que sea el dueño o un admin ya lo validó eventOwnership en la ruta.)
export async function updateEvent(id, body) {
    const event = await findEventOrFail(id);
    if (LOCKED_STATUSES.includes(event.status)) {
        throw new HttpError(409, `No se puede modificar un evento ${event.status === EVENT_STATUS.CANCELLED ? "cancelado" : "finalizado"}`);
    }

    const changes = pickEditable(body);
    if (Object.keys(changes).length === 0) {
        throw new HttpError(400, `No hay campos para actualizar. Campos editables: ${EDITABLE_FIELDS.join(", ")}`);
    }
    validateEventData(changes, { partial: true });
    return eventsRepository.update(id, changes);
}

// PATCH /api/events/:id/status — publicar, cancelar o finalizar según las transiciones.
// (Que sea el dueño o un admin ya lo validó eventOwnership en la ruta.)
export async function changeEventStatus(id, newStatus) {
    const event = await findEventOrFail(id);
    if (!Object.values(EVENT_STATUS).includes(newStatus)) {
        throw new HttpError(400, `Estado inválido. Opciones: ${Object.values(EVENT_STATUS).join(", ")}`);
    }
    if (event.status === newStatus) {
        throw new HttpError(409, `El evento ya está en estado "${newStatus}"`);
    }
    if (!STATUS_TRANSITIONS[event.status].includes(newStatus)) {
        throw new HttpError(409, `No se puede pasar un evento de "${event.status}" a "${newStatus}"`);
    }
    if (newStatus === EVENT_STATUS.PUBLISHED && new Date(event.date) <= new Date()) {
        throw new HttpError(400, "No se puede publicar un evento con fecha pasada");
    }
    return eventsRepository.update(id, { status: newStatus });
}
