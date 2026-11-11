const mysql = require('mysql2');

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno.');
}

const pool = mysql.createPool({
  uri: url,
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
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

module.exports = {
  query,
  execute: (sql, params) => query(sql, params),
  getConnection: () => db.getConnection(),
  pool: db
};
