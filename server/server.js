/**
 * FinansApp Backend Server
 * - Express + Aiven MySQL
 * - API para verificación de documentos con Verifik
 */

// ============================================
// IMPORTS
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const mysql = require('mysql2/promise');

// Variables globales
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Crear directorio de uploads si no existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('📁 Carpeta /uploads creada');
}

// ============================================
// CONFIG
// ============================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(UPLOAD_DIR));

// ============================================
// MYSQL POOL (Aiven)
// ============================================
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'finansapp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false  // Aiven usa certificados autofirmados
  }
});

// ============================================
// PRUEBA DE CONEXIÓN MySQL
// ============================================
(async () => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    connection.release();
    console.log('✅ Conexión MySQL OK, 1+1 =', rows[0].result);
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
    console.error('\n⚠️  CONFIGURACIÓN REQUERIDA:');
    console.error('   1. Obtén credenciales de Aiven MySQL en: https://console.aiven.io');
    console.error('   2. Edita server/.env con:');
    console.error('      - DB_HOST: tu host de Aiven');
    console.error('      - DB_USER: usuario');
    console.error('      - DB_PASSWORD: contraseña\n');
  }
})();

// ============================================
// INIT DATABASE
// ============================================
async function initDB() {
  try {
    const connection = await pool.getConnection();
    
    // Crear tabla users
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar usuario por defecto si no existe
    try {
      await connection.execute(
        `INSERT INTO users (id, name, email) VALUES (1, 'Usuario Sistema', 'sistema@vuelveacasa.com')
         ON DUPLICATE KEY UPDATE name = 'Usuario Sistema'`
      );
    } catch (e) {
      // Ignorar si ya existe
    }

    // Crear tabla documentos
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS documentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        docType VARCHAR(10) NOT NULL,
        docNumber VARCHAR(20) NOT NULL,
        nombre VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_doc (docType, docNumber)
      )
    `);

    // Crear tabla cases
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        age INT,
        gender VARCHAR(20),
        date_missing DATETIME,
        location VARCHAR(255) NOT NULL,
        physical_desc TEXT,
        disappearance_desc TEXT,
        contact_info VARCHAR(255),
        photo_url VARCHAR(500),
        reporter_id INT,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    connection.release();
    console.log('✅ Base de datos inicializada');
  } catch (err) {
    console.error('❌ Error inicializando BD:', err.message);
    setTimeout(initDB, 5000); // Reintentar en 5s
  }
}

// ============================================
// ROTAS - SERVIR HTML
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

app.get('/case-detail', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'case-detail.html'));
});

app.get('/recover', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'recover.html'));
});

app.get('/reset', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'reset.html'));
});

// ============================================
// ENDPOINT PRINCIPAL - DB First
// ============================================
app.post('/api/verificar-documento', async (req, res) => {
  const { docType, docNumber } = req.body;

  if (!docType || !docNumber) {
    return res.status(400).json({
      valido: false,
      mensaje: 'Tipo y número de documento son requeridos.'
    });
  }

  // MODO DESARROLLO: Simplemente aceptar sin verificar
  console.log(`✅ Documento aceptado: ${docType}-${docNumber}`);
  return res.json({
    valido: true,
    nombre: 'Usuario Verificado',
    mensaje: 'Documento aceptado en modo desarrollo.'
  });
});

// ============================================
// UPLOAD IMAGEN (POST /api/upload)
// ============================================
app.post('/api/upload', async (req, res) => {
  try {
    const { image, filename } = req.body;
    
    if (!image || !image.startsWith('data:image')) {
      return res.status(400).json({ error: 'Imagen inválida' });
    }

    // Extraer el tipo y los datos base64
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Formato base64 inválido' });
    }

    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generar nombre único
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    
    // Guardar el archivo
    fs.writeFileSync(filePath, buffer);
    
    const imageUrl = `/uploads/${uniqueName}`;
    console.log('📸 Imagen subida:', imageUrl);
    
    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error('Error en upload:', err.message);
    res.status(500).json({ error: 'Error subiendo imagen' });
  }
});

// ============================================
// CREAR NUEVO CASO
// ============================================
app.post('/api/cases', async (req, res) => {
  try {
    // De momento, simulamos el id del usuario (luego lo obtendrás de sesión/JWT)
    const reporterId = 1;

    const {
      name,
      age,
      gender,
      dateMissing,
      location,
      physicalDescription,
      disappearanceDescription,
      contactInfo,
      photoUrl
    } = req.body;

    console.log('📥 POST /api/cases - Datos recibidos:', { name, location });

    if (!name || !location) {
      console.log('❌ Validación fallida: nombre o ubicación vacíos');
      return res.status(400).json({ error: 'Nombre y ubicación son obligatorios' });
    }

    const [result] = await pool.execute(
      `INSERT INTO cases
       (name, age, gender, date_missing, location, physical_desc, disappearance_desc,
        contact_info, photo_url, reporter_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        name,
        age || null,
        gender || null,
        dateMissing || null,
        location,
        physicalDescription || null,
        disappearanceDescription || null,
        contactInfo || null,
        photoUrl || null,
        reporterId
      ]
    );

    console.log('✅ Caso insertado con ID:', result.insertId);
    res.json({ id: result.insertId });
  } catch (err) {
    console.error('❌ Error en POST /api/cases:', err.message);
    res.status(500).json({ error: 'Error creando el caso: ' + err.message });
  }
});

// ============================================
// LISTAR CASOS (GET /api/cases) - Solo APROBADOS
// ============================================
app.get('/api/cases', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.*, u.name AS reporter_name
       FROM cases c
       LEFT JOIN users u ON c.reporter_id = u.id
       WHERE c.status = 'ACTIVE'
       ORDER BY c.created_at DESC`
    );
    console.log('GET /api/cases - Casos APROBADOS encontrados:', rows.length);
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /api/cases:', err.message);
    res.status(500).json({ error: 'Error obteniendo casos' });
  }
});

// ============================================
// LISTAR CASOS PENDIENTES (GET /api/cases/pending) - Admin
// ============================================
app.get('/api/cases/pending', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.*, u.name AS reporter_name
       FROM cases c
       LEFT JOIN users u ON c.reporter_id = u.id
       WHERE c.status = 'PENDING'
       ORDER BY c.created_at DESC`
    );
    console.log('GET /api/cases/pending - Casos PENDIENTES encontrados:', rows.length);
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /api/cases/pending:', err.message);
    res.status(500).json({ error: 'Error obteniendo casos pendientes' });
  }
});

// ============================================
// APROBAR CASO (PUT /api/cases/:id/approve) - Admin
// ============================================
app.put('/api/cases/:id/approve', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await pool.execute(
      `UPDATE cases SET status = 'ACTIVE' WHERE id = ?`,
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }
    
    console.log('✅ Caso', id, 'aprobado');
    res.json({ success: true, message: 'Caso aprobado' });
  } catch (err) {
    console.error('Error aprobando caso:', err.message);
    res.status(500).json({ error: 'Error aprobando caso' });
  }
});

// ============================================
// RECHAZAR CASO (PUT /api/cases/:id/reject) - Admin
// ============================================
app.put('/api/cases/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  try {
    const [result] = await pool.execute(
      `UPDATE cases SET status = 'REJECTED', reject_reason = ? WHERE id = ?`,
      [reason || null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }
    
    console.log('❌ Caso', id, 'rechazado');
    res.json({ success: true, message: 'Caso rechazado' });
  } catch (err) {
    console.error('Error rechazando caso:', err.message);
    res.status(500).json({ error: 'Error rechazando caso' });
  }
});

// ============================================
// LIMPIAR CASOS (DELETE /api/admin/reset-cases) - SOLO DESARROLLO
// ============================================
app.delete('/api/admin/reset-cases', async (req, res) => {
  try {
    await pool.execute('DELETE FROM cases');
    console.log('🔄 Todos los casos fueron eliminados');
    res.json({ success: true, message: 'Casos eliminados' });
  } catch (err) {
    console.error('Error limpiando casos:', err.message);
    res.status(500).json({ error: 'Error limpiando casos' });
  }
});

// ============================================
// STARTUP
// ============================================
(async () => {
  await initDB();
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`🟢 Servidor en http://localhost:${PORT} con Aiven MySQL`);
  });

  process.on('SIGINT', async () => {
    console.log('🔴 Cerrando...');
    await pool.end();
    server.close(() => process.exit(0));
  });
})();
