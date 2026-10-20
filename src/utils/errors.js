// Error con código HTTP. Lo lanzan los services y lo responde error.middleware.js
export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
