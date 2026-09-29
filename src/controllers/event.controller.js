import { notImplemented } from "./notImplemented.js";

export async function getAllEvents(req, res) {
    res.status(200).json({ status: "success", payload: [] });
}

export const getEventById = notImplemented;
export const createEvent = notImplemented;
export const updateEvent = notImplemented;
export const deleteEvent = notImplemented;
