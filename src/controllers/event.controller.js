import * as eventsService from "../services/events.service.js";

// Los controllers solo manejan request/response: la lógica está en events.service.js

export async function getAllEvents(req, res, next) {
    try {
        const result = await eventsService.listEvents(req.query, req.user);
        res.status(200).json({ status: "success", ...result });
    } catch (error) {
        next(error);
    }
}

export async function getEventById(req, res, next) {
    try {
        const event = await eventsService.getEvent(req.params.id, req.user);
        res.status(200).json({ status: "success", payload: event });
    } catch (error) {
        next(error);
    }
}

export async function createEvent(req, res, next) {
    try {
        const event = await eventsService.createEvent(req.body, req.user);
        res.status(201).json({ status: "success", payload: event });
    } catch (error) {
        next(error);
    }
}

export async function updateEvent(req, res, next) {
    try {
        const event = await eventsService.updateEvent(req.params.id, req.body);
        res.status(200).json({ status: "success", payload: event });
    } catch (error) {
        next(error);
    }
}

export async function changeEventStatus(req, res, next) {
    try {
        const event = await eventsService.changeEventStatus(req.params.id, req.body?.status);
        res.status(200).json({ status: "success", payload: event });
    } catch (error) {
        next(error);
    }
}
