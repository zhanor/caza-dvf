import { Pool } from "pg";

// On force la désactivation du SSL car la DB est en local sur le VPS
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

export default pool;
