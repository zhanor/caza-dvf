import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // IMPORTANT : On désactive SSL car le serveur Postgres local ne le gère pas
  ssl: false, 
});

export default pool;
