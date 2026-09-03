# 🍞 Delicias de Campeche — Tienda en Línea

Sistema de ventas en línea para una pastelería artesanal, con carrito de compras, pagos con Mercado Pago, panel de administración y gestión de pedidos en tiempo real.

---

## 🚀 Demo en Producción

```
https://carrito-de-compras-phi-three.vercel.app
```

| Panel | URL |
|---|---|
| Tienda | `/` |
| Administrador | `/admin.html` |
| Empleado de cocina | `/empleado.html` |
| Repartidor | `/repartidor.html` |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML, Tailwind CSS, Lucide Icons, Vanilla JS |
| Backend | Node.js + Express 5 |
| Base de datos | MySQL (vía `mysql2`) |
| Pagos | Mercado Pago SDK v2 |
| Deploy | Vercel (Serverless) |

---

## 📁 Estructura del Proyecto

```
/
├── index.html          # Tienda pública (catálogo + carrito + checkout)
├── admin.html          # Panel de administrador
├── empleado.html       # Panel de cocina / empleado
├── repartidor.html     # Panel de repartidor
├── server.js           # API REST con Express
├── database.js         # Conexión a MySQL con pool
├── package.json
├── vercel.json         # Configuración de rutas y builds para Vercel
└── .env                # Variables de entorno (no se sube a Git)
```

---

## ⚙️ Variables de Entorno

Crea un archivo `.env` en la raíz (o configúralas en Vercel → Settings → Environment Variables):

```env
DATABASE_URL=mysql://usuario:contraseña@host:puerto/nombre_db
ACCESS_TOKEN=APP_USR-tu-token-de-mercado-pago
```

---

## 🗄️ Base de Datos

El servidor crea las tablas automáticamente al arrancar si no existen.

**Tabla `productos`**
```sql
id, name, category, description, price, stock, img
```

**Tabla `pedidos`**
```sql
id, cliente, items (JSON), total, status, tipoEntrega, direccion, fecha, motivo_cancelacion, created_at
```

**Tabla `usuarios`**
```sql
id, name, email, password, role (admin | employee | driver | client), created_at
```

**Usuarios por defecto (se crean solos si la tabla está vacía):**

| Rol | Email | Contraseña |
|---|---|---|
| Admin | admin@correo.com | admin |
| Empleado | emp@correo.com | 123 |
| Repartidor | rep@correo.com | 123 |

---

## 🔌 API Endpoints

### Productos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/productos` | Obtener todos los productos |
| POST | `/api/productos` | Agregar producto |
| PUT | `/api/productos/:id` | Actualizar producto (precio, stock, etc.) |
| DELETE | `/api/productos/:id` | Eliminar producto |

### Pedidos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/pedidos` | Obtener todos los pedidos |
| POST | `/api/pedidos` | Crear pedido nuevo |
| PUT | `/api/pedidos/:id` | Actualizar estado del pedido |

### Usuarios
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/usuarios` | Obtener todos los usuarios |
| POST | `/api/usuarios` | Registrar usuario nuevo |
| POST | `/api/login` | Iniciar sesión |
| PUT | `/api/usuarios/:id/password` | Cambiar contraseña |
| DELETE | `/api/usuarios/:id` | Eliminar usuario |

### Mercado Pago
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/crear-preferencia` | Genera preferencia de pago |

---

## 🏪 Funcionalidades por Panel

### Tienda (`index.html`)
- Catálogo de productos con filtros por categoría
- Modal de producto con foto, descripción, ingredientes y reseñas
- Carrito de compras con validación de stock en tiempo real
- Checkout con opción de recoger en tienda o envío a domicilio
- Pago con Mercado Pago (tarjeta, OXXO, etc.)
- Sistema de login y registro de clientes
- Historial de pedidos por usuario
- Reseñas y calificaciones por producto

### Admin (`admin.html`)
- Inventario en tiempo real (agregar, editar precio/stock, eliminar)
- Gestión de pedidos con filtros por estado y opción de cancelar con motivo
- Moderación de reseñas con respuestas
- Gestión de cuentas de empleados y repartidores
- Cambio de contraseña propia

### Empleado (`empleado.html`)
- Vista de pedidos activos de cocina
- Actualización de estado: Pendiente → Preparando → Listo

### Repartidor (`repartidor.html`)
- Vista de pedidos listos para entregar
- Actualización de estado: Listo → En camino → Entregado

---

## 💻 Correr en Local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo .env con tus credenciales
cp .env.example .env

# 3. Iniciar servidor
npm start
# → http://localhost:3000
```

---

## 🚢 Deploy en Vercel

```bash
# Conectar repositorio en vercel.com
# Agregar variables de entorno en Settings → Environment Variables
# Cada git push a main despliega automáticamente
git add .
git commit -m "descripción del cambio"
git push
```

---

## 📝 Licencia

Proyecto privado — Delicias de Campeche © 2024
