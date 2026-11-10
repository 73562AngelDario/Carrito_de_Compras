  const mysql = require('mysql2');

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno.');
}

const db = mysql.createPool({
  uri: url,
  waitForConnections: true,
  connectionLimit: 3,
  connectTimeout: 20000,
  enableKeepAlive: true
});

module.exports = db.promise();
