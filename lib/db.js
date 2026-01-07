import { Pool } from "pg";

// On force la désactivation du SSL car la DB est en local sur le VPS
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false 
});

export default pool;
