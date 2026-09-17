export async function getAllEvents(req, res, next) {
  try {
    res.status(200).json({ status: 'success', payload: [] });
  } catch (error) {
    next(error);
  }
}

export async function getEventById(req, res, next) {
  try {
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(req, res, next) {
  try {
  } catch (error) {
    next(error);
  }
}
