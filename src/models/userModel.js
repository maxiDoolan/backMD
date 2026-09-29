import { Schema, model } from "mongoose";

const userSchema = new Schema({
    first_name: { type: String, required: true, trim: true },
    last_name:  { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
    password:   { type: String, required: true },
    role:       { type: String, enum: ["user", "organizer", "admin"], default: "user" },
});

export const userModel = model("Users", userSchema);
