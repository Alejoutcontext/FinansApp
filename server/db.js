const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',            // si pusiste contraseña en XAMPP, escríbela aquí
  database: 'vuelveacasa', // el nombre que creamos en phpMyAdmin
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
