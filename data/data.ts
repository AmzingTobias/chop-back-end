import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

export interface ICustomError extends Error {
  code?: string;
}

// Client config loaded from process.env
const pool = new Pool();

export default pool;
