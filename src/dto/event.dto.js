import { toId, isPopulated } from "./helpers.js";
import { PublicUserDTO } from "./user.dto.js";

// Evento para respuestas. Si el organizer viene populado, solo expone sus datos públicos.
export class EventDTO {
    constructor(event) {
        this.id = toId(event);
        this.title = event.title;
        this.description = event.description;
        this.category = event.category;
        this.date = event.date;
        this.location = event.location;
        this.capacity = event.capacity;
        this.price = event.price;
        this.status = event.status;
        this.organizer = isPopulated(event.organizer) ? new PublicUserDTO(event.organizer) : toId(event.organizer);
        this.createdAt = event.createdAt;
        this.updatedAt = event.updatedAt;
    }
}

// Resumen del evento cuando viene populado dentro de un ticket
export class EventSummaryDTO {
    constructor(event) {
        this.id = toId(event);
        this.title = event.title;
        this.date = event.date;
        this.location = event.location;
        this.status = event.status;
    }
}
