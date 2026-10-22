import { Schema, model } from "mongoose";
import { ROLES } from "../config/roles.js";

const userSchema = new Schema({
    first_name: { type: String, required: true, trim: true },
    last_name:  { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
    // select: false → nunca viene en las consultas salvo que se pida explícitamente (+password)
    password:   { type: String, required: true, select: false },
    role:       { type: String, enum: Object.values(ROLES), default: ROLES.USER },
});

export const userModel = model("Users", userSchema);
