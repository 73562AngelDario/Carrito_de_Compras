require('dotenv').config();
// Servidor para procesar pagos de Mercado Pago - Delicias de Campeche
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const db = require('./database');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ FIX: No llamar process.exit() — crashea la función serverless de Vercel
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const client = ACCESS_TOKEN
    ? new MercadoPagoConfig({ accessToken: ACCESS_TOKEN.trim() })
    : null;

// ─────────────────────────────────────────────
//  API DE PRODUCTOS (sincroniza admin ↔ tienda)
// ─────────────────────────────────────────────

// ✅ FIX: Crear tabla de productos si no existe (faltaba por completo)
// img es LONGTEXT porque las fotos subidas se guardan como base64 y pueden
// ser cadenas muy largas; con VARCHAR fallaban o se truncaban los INSERT/UPDATE.
db.query(`CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    category VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2),
    stock INT DEFAULT 0,
    img LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).catch(err => console.error('Error creando tabla productos:', err));

// GET — Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener productos:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST — Agregar producto nuevo
app.post('/api/productos', async (req, res) => {
    try {
        const { name, category, description, price, stock, img } = req.body;
        const [result] = await db.query(
            'INSERT INTO productos (name, category, description, price, stock, img) VALUES (?,?,?,?,?,?)',
            [name, category, description, price, stock, img]
        );
        res.json({ id: result.insertId, name, category, description, price, stock, img });
    } catch (err) {
        console.error('Error al agregar producto:', err.message);
        res.status(500).json({ error: 'No se pudo agregar el producto', message: err.message });
    }
});

// PUT — Actualizar producto
app.put('/api/productos/:id', async (req, res) => {
    try {
        const { name, category, description, price, stock, img } = req.body;
        await db.query(
            'UPDATE productos SET name=?, category=?, description=?, price=?, stock=?, img=? WHERE id=?',
            [name, category, description, price, stock, img, req.params.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error('Error al actualizar producto:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE — Eliminar producto
app.delete('/api/productos/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM productos WHERE id=?', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error('Error al eliminar producto:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
//  MERCADO PAGO
// ─────────────────────────────────────────────

app.post('/crear-preferencia', async (req, res) => {
    // ✅ FIX: Manejar token faltante dentro de la ruta, no al arrancar
    if (!client) {
        return res.status(500).json({
            error: "Configuración incompleta",
            message: "ACCESS_TOKEN no está definido en las variables de entorno de Vercel."
        });
    }

    try {
        const { items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Carrito vacío" });
        }

        const origin = req.headers.origin || "http://localhost:3000";

        const body = {
            items: items.map(item => ({
                title: String(item.title).substring(0, 250),
                quantity: parseInt(item.quantity),
                unit_price: parseFloat(item.unit_price),
                currency_id: 'MXN'
            })),
            back_urls: {
                success: `${origin}/index.html?status=success`,
                failure: `${origin}/index.html?status=failure`,
                pending: `${origin}/index.html?status=pending`,
            },
            auto_return: "approved",
            statement_descriptor: "DELICIAS CAMP",
            external_reference: "dc_" + Date.now(),
        };

        const preference = new Preference(client);
        const result = await preference.create({ body });

        console.log("✅ Preferencia generada. ID:", result.id);
        res.json({ id: result.id });

    } catch (error) {
        console.error("❌ ERROR MERCADO PAGO:", error);
        res.status(error.status || 500).json({
            error: "Error de Mercado Pago",
            message: error.message || "No se pudo crear la preferencia"
        });
    }
});

// ─────────────────────────────────────────────
//  API DE RESEÑAS
// ─────────────────────────────────────────────

// Crear tabla de reseñas si no existe
db.query(`CREATE TABLE IF NOT EXISTS resenas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productId INT,
    productName VARCHAR(255),
    autor VARCHAR(255),
    rating INT DEFAULT 5,
    text TEXT,
    response TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).catch(err => console.error('Error creando tabla resenas:', err));

// GET — Obtener todas las reseñas
app.get('/api/resenas', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM resenas ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — Agregar reseña
app.post('/api/resenas', async (req, res) => {
    try {
        const { productId, productName, autor, rating, text } = req.body;
        const [result] = await db.query(
            'INSERT INTO resenas (productId, productName, autor, rating, text) VALUES (?,?,?,?,?)',
            [productId, productName, autor, rating || 5, text]
        );
        res.json({ id: result.insertId, productId, productName, autor, rating, text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT — Responder reseña
app.put('/api/resenas/:id/respuesta', async (req, res) => {
    try {
        const { response } = req.body;
        await db.query('UPDATE resenas SET response=? WHERE id=?', [response, req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE — Eliminar reseña
app.delete('/api/resenas/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM resenas WHERE id=?', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
//  RUTAS DE PÁGINAS HTML
// ─────────────────────────────────────────────
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/empleado.html', (req, res) => res.sendFile(path.join(__dirname, 'empleado.html')));
app.get('/repartidor.html', (req, res) => res.sendFile(path.join(__dirname, 'repartidor.html')));

// ─────────────────────────────────────────────
//  API DE PEDIDOS
// ─────────────────────────────────────────────

// Crear tabla de pedidos si no existe
db.query(`CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente VARCHAR(255),
    items JSON,
    total DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'Pendiente',
    tipoEntrega VARCHAR(50),
    direccion TEXT,
    fecha VARCHAR(100),
    motivo_cancelacion VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).then(async () => {
    // Migracion segura: agrega la columna solo si no existe (compatible con MySQL < 8.0)
    const [cols] = await db.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'pedidos'
          AND COLUMN_NAME = 'motivo_cancelacion'
    `);
    if (cols.length === 0) {
        await db.query(`ALTER TABLE pedidos ADD COLUMN motivo_cancelacion VARCHAR(255) DEFAULT NULL`);
        console.log('\u2705 Columna motivo_cancelacion agregada a pedidos');
    }
}).catch(err => console.error('Error creando tabla pedidos:', err));

// Crear tabla de usuarios si no existe
db.query(`CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(50) DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).then(async () => {
    // Insertar usuarios por defecto si no existen
    const [rows] = await db.query('SELECT COUNT(*) as count FROM usuarios');
    if (rows[0].count === 0) {
        await db.query(`INSERT INTO usuarios (name, email, password, role) VALUES
            ('Admin Principal', 'admin@correo.com', 'admin', 'admin'),
            ('Empleado de Cocina', 'emp@correo.com', '123', 'employee'),
            ('Repartidor', 'rep@correo.com', '123', 'driver')`);
    }
}).catch(err => console.error('Error creando tabla usuarios:', err));

// GET — Obtener todos los pedidos
app.get('/api/pedidos', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM pedidos ORDER BY created_at DESC');
        const pedidos = rows.map(o => ({ ...o, items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items }));
        res.json(pedidos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — Crear pedido nuevo
app.post('/api/pedidos', async (req, res) => {
    try {
        const { cliente, items, total, status, tipoEntrega, direccion, fecha } = req.body;
        const [result] = await db.query(
            'INSERT INTO pedidos (cliente, items, total, status, tipoEntrega, direccion, fecha) VALUES (?,?,?,?,?,?,?)',
            [cliente, JSON.stringify(items), total, status || 'Pendiente', tipoEntrega, direccion, fecha]
        );

        // ✅ FIX: Descontar stock de cada producto al crear el pedido
        if (Array.isArray(items)) {
            for (const item of items) {
                await db.query(
                    'UPDATE productos SET stock = GREATEST(stock - ?, 0) WHERE id = ?',
                    [item.quantity, item.id]
                );
            }
        }

        res.json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT — Actualizar estado del pedido (con motivo de cancelación opcional)
app.put('/api/pedidos/:id', async (req, res) => {
    try {
        const { status, motivo_cancelacion } = req.body;
        if (motivo_cancelacion !== undefined) {
            await db.query('UPDATE pedidos SET status=?, motivo_cancelacion=? WHERE id=?', [status, motivo_cancelacion, req.params.id]);
        } else {
            await db.query('UPDATE pedidos SET status=? WHERE id=?', [status, req.params.id]);
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
//  API DE USUARIOS
// ─────────────────────────────────────────────

// GET — Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, email, password, role FROM usuarios');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — Login de usuario
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        let query = 'SELECT id, name, email, role FROM usuarios WHERE email=? AND password=?';
        const params = [email, password];
        if (role) { query += ' AND role=?'; params.push(role); }
        const [rows] = await db.query(query, params);
        if (rows.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT — Actualizar contraseña de usuario
app.put('/api/usuarios/:id/password', async (req, res) => {
    try {
        const { password } = req.body;
        await db.query('UPDATE usuarios SET password=? WHERE id=?', [password, req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST — Agregar usuario
app.post('/api/usuarios', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const [result] = await db.query(
            'INSERT INTO usuarios (name, email, password, role) VALUES (?,?,?,?)',
            [name, email, password, role || 'client']
        );
        res.json({ id: result.insertId, name, email, role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE — Eliminar usuario
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM usuarios WHERE id=?', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ FIX: app.listen() solo en desarrollo local, NUNCA en Vercel
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log("===============================================");
        console.log(`🚀 Servidor Delicias de Campeche en Puerto ${port}`);
        console.log(`🔑 Token: ${ACCESS_TOKEN ? ACCESS_TOKEN.substring(0, 15) + '...' : '⚠️  No configurado'}`);
        console.log("===============================================");
    });
}

// Vercel usa esto directamente
module.exports = app;