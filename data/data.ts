import dotenv from "dotenv";
import { Pool } from "pg";

export enum EDatabaseResponses {
  OK,
  CONFLICT,
  DOES_NOT_EXIST,
  FOREIGN_KEY_VIOLATION,
}

dotenv.config();

export interface ICustomError extends Error {
  code?: string;
}

// Client config loaded from process.env
const pool = new Pool();

export default pool;
