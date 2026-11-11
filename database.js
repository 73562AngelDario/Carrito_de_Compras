const mysql = require('mysql2');

const raw = process.env.DATABASE_URL;

if (!raw) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno.');
}

const u = new URL(raw.trim());

const pool = mysql.createPool({
  host: u.hostname,
  port: Number(u.port) || 3306,
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace('/', ''),
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 1,
  maxIdle: 0,
  idleTimeout: 5000,
  connectTimeout: 30000,
  enableKeepAlive: false
});

const db = pool.promise();

async function query(sql, params, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      return await db.query(sql, params);
    } catch (err) {
      const reintentable = ['PROTOCOL_CONNECTION_LOST', 'ECONNRESET', 'ETIMEDOUT'].includes(err.code)
        || /Connection lost|closed the connection/i.test(err.message);
      if (!reintentable || i === intentos - 1) throw err;
      await new Promise(r => setTimeout(r, 700));
    }
  }
}

module.exports = {
  query,
  execute: (sql, params) => query(sql, params),
  getConnection: () => db.getConnection(),
  pool: db
};
