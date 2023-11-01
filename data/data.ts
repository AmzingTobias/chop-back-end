import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

// Client config loaded from process.env
const pool = new Pool();

export default pool;
