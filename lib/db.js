import { Pool } from "pg";

// DB locale sur le VPS — SSL avec rejectUnauthorized:false (certificat auto-signé)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

export default pool;
