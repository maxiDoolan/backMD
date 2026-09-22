import { config } from "dotenv";
config();

export const env = {
    port: process.env.PORT,
    mongodbUrl: process.env.MONGODB_URL  // coincide con .env
}
