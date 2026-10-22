// Estados del dominio. Viven acá (y no en los modelos) para que services,
// DTOs y modelos los compartan sin que los services importen modelos.

export const EVENT_STATUS = Object.freeze({
    DRAFT: "draft",         // borrador: solo lo ven su organizador y los admin
    PUBLISHED: "published", // visible para todos
    CANCELLED: "cancelled", // cancelado (no se borra físicamente)
    FINISHED: "finished",   // ya ocurrió
});

export const TICKET_STATUS = Object.freeze({
    CONFIRMED: "confirmed", // inscripción confirmada (ocupa cupo)
    PENDING: "pending",     // reservada a confirmar, ej. pago pendiente (ocupa cupo)
    CANCELLED: "cancelled", // cancelada (NO ocupa cupo)
});

// Estados que ocupan cupo y cuentan como "inscripción activa"
export const ACTIVE_TICKET_STATUSES = Object.freeze([TICKET_STATUS.CONFIRMED, TICKET_STATUS.PENDING]);
