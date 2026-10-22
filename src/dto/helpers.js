// Devuelve el id como string, venga como _id, id u ObjectId suelto
export const toId = (value) => (value == null ? value : String(value._id ?? value.id ?? value));

// ¿Es un documento populado (objeto con datos) o solo una referencia (ObjectId)?
export const isPopulated = (value) =>
    value != null && typeof value === "object" && ("_id" in value || "id" in value) && Object.keys(value).length > 1;
