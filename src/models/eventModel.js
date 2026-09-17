import { Schema, model } from 'mongoose';

const eventSchema = new Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  place: { type: String, required: true },
  capacity: { type: Number, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
});

export const eventModel = model('Events', eventSchema);
