import * as ticketsService from "../services/tickets.service.js";

// Los controllers solo manejan request/response: la lógica está en tickets.service.js

export async function enroll(req, res, next) {
    try {
        const { ticket, emailSent } = await ticketsService.enroll(req.params.eid, req.body, req.user);
        res.status(201).json({
            status: "success",
            message: emailSent
                ? "Inscripción confirmada. Te enviamos un email con los datos."
                : "Inscripción confirmada (no se pudo enviar el email de confirmación).",
            emailSent,
            payload: ticket,
        });
    } catch (error) {
        next(error);
    }
}

export async function getMyTickets(req, res, next) {
    try {
        const tickets = await ticketsService.getMyTickets(req.user);
        res.status(200).json({ status: "success", payload: tickets });
    } catch (error) {
        next(error);
    }
}

export async function getEventTickets(req, res, next) {
    try {
        const result = await ticketsService.getEventTickets(req.params.eid);
        res.status(200).json({ status: "success", payload: result });
    } catch (error) {
        next(error);
    }
}

export async function cancelTicket(req, res, next) {
    try {
        const ticket = await ticketsService.cancelTicket(req.params.tid);
        res.status(200).json({ status: "success", message: "Ticket cancelado", payload: ticket });
    } catch (error) {
        next(error);
    }
}
