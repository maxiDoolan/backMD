// Error con código HTTP asociado, para que el controller sepa qué status responder
export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
