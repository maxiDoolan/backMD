import { isValidObjectId } from "mongoose";

// ¿El valor tiene formato de id de MongoDB? (los services lo usan sin importar mongoose)
export const isValidId = (value) => isValidObjectId(value);

export const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
