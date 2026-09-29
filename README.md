# BackMD — API REST para plataforma de eventos

Backend con **Node.js, Express, MongoDB (Mongoose)** y autenticación con **JWT guardado en una cookie HttpOnly**.

## Instalación

```bash
npm install
cp .env.example .env   # completar los valores
npm run dev            # o: npm start
```

### Variables de entorno

| Variable         | Descripción                                             | Ejemplo                         |
|------------------|---------------------------------------------------------|---------------------------------|
| `PORT`           | Puerto del servidor                                     | `3000`                          |
| `MONGO_URL`      | String de conexión a MongoDB Atlas                      | `mongodb+srv://...`             |
| `JWT_SECRET`     | Secreto para firmar los JWT (largo y aleatorio)         | —                               |
| `JWT_EXPIRES_IN` | Expiración del token                                    | `1h`                            |
| `NODE_ENV`       | `development` o `production` (activa `secure` en cookie)| `development`                   |

> El archivo `.env` **no** se sube al repositorio (está en `.gitignore`).

---

## Rutas

| Método | Ruta                       | Descripción                                             | Protegida |
|--------|----------------------------|---------------------------------------------------------|-----------|
| GET    | `/api/health`              | Verifica que el servidor esté activo                    | No        |
| POST   | `/api/sessions/register`   | Registra un usuario (hashea la contraseña)              | No        |
| POST   | `/api/sessions/login`      | Valida credenciales y setea la cookie `currentUser`     | No        |
| GET    | `/api/sessions/current`    | Devuelve el usuario autenticado según el JWT            | Sí        |
| POST   | `/api/sessions/logout`     | Elimina la cookie `currentUser`                         | No        |

Rutas en desarrollo (responden `501 Endpoint no implementado todavía`): `/api/events`, `/api/users`, `/api/tickets`. `GET /api/events` devuelve una lista vacía.

---

### `GET /api/health`

**Response `200`:**
```json
{ "status": "ok", "message": "Servidor activo" }
```

---

### `POST /api/sessions/register`

Valida campos, normaliza el email (trim + minúsculas), rechaza duplicados y guarda la contraseña hasheada con bcrypt. El `role` no se acepta desde el body: siempre es `"user"`.

**Request:**
```json
{ "first_name": "Ana", "last_name": "Pérez", "email": "Ana@Mail.com ", "password": "Secreta123" }
```

**Response `201`:**
```json
{
  "status": "success",
  "payload": { "id": "665f2a...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "role": "user" }
}
```

**Errores:**

| Status | Caso                         | Response                                                                 |
|--------|------------------------------|--------------------------------------------------------------------------|
| 400    | Faltan campos                | `{ "status": "error", "message": "Faltan campos obligatorios" }`         |
| 400    | Email con formato inválido   | `{ "status": "error", "message": "Formato de email inválido" }`          |
| 400    | Contraseña < 6 caracteres    | `{ "status": "error", "message": "La contraseña debe tener al menos 6 caracteres" }` |
| 409    | Email ya registrado          | `{ "status": "error", "message": "El email ya está registrado" }`        |

---

### `POST /api/sessions/login`

Busca el usuario por email y compara la contraseña con bcrypt. Si es correcta, genera un JWT con payload `{ id, email, role }` firmado con `JWT_SECRET` y lo guarda en la cookie `currentUser` (`httpOnly: true`, `sameSite: 'lax'`, `maxAge: 3600000`, `secure` solo en producción).

**Request:**
```json
{ "email": "ana@mail.com", "password": "Secreta123" }
```

**Response `200`** (y header `Set-Cookie: currentUser=<jwt>; HttpOnly; SameSite=Lax`):
```json
{ "status": "success", "message": "Login correcto" }
```

**Response `401`** (email inexistente **o** contraseña incorrecta — mismo mensaje):
```json
{ "status": "error", "message": "Credenciales inválidas" }
```

**Response `400`** (falta email o password):
```json
{ "status": "error", "message": "Faltan campos obligatorios" }
```

---

### `GET /api/sessions/current`

El middleware `auth` lee la cookie `currentUser`, verifica el JWT y guarda el payload en `req.user`.

**Response `200`** (con la cookie):
```json
{ "status": "success", "payload": { "id": "665f2a...", "email": "ana@mail.com", "role": "user" } }
```

**Response `401`** (sin cookie, token manipulado o expirado):
```json
{ "status": "error", "message": "No autenticado" }
```

---

### `POST /api/sessions/logout`

**Response `200`** (borra la cookie `currentUser`):
```json
{ "status": "success", "message": "Sesión cerrada" }
```

---

## Casos de prueba

1. Registro → login → `/current` (200) → logout → `/current` (401)
2. Login con email inexistente → 401 `Credenciales inválidas`
3. Login con contraseña incorrecta → 401 `Credenciales inválidas`
4. `/current` sin cookie → 401 `No autenticado`
5. `/current` con token manipulado o expirado → 401 `No autenticado`

> En Postman / Thunder Client las cookies se guardan automáticamente después del login, así que `/current` funciona sin configurar nada extra.

---

## Estructura

```
src/
├── app.js                      # configuración de Express (sin lógica de auth)
├── server.js                   # conecta a MongoDB y levanta el servidor
├── config/
│   ├── env.js                  # lee y valida variables de entorno
│   ├── db.js                   # conexión a MongoDB
│   └── cookie.js               # nombre y opciones de la cookie de auth
├── models/userModel.js
├── routes/sessions.router.js
├── controllers/sessions.controller.js
├── services/sessions.service.js      # validaciones y lógica de negocio
├── repositories/users.repository.js  # decide qué datos devolver (sin password)
├── dao/users.dao.js                  # acceso directo a Mongoose
├── middlewares/auth.middleware.js    # verifica el JWT de la cookie
└── utils/
    ├── jwt.js                  # firmar / verificar JWT
    ├── hash.js                 # bcrypt
    └── errors.js               # HttpError (error con status)
```

Flujo: `router → controller → service → repository → DAO → modelo`.
