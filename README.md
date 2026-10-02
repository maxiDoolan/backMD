# BackMD — API REST para plataforma de eventos

Backend con **Node.js, Express, MongoDB (Mongoose)**, autenticación centralizada con **Passport.js** (JWT en cookie HttpOnly) y **autorización por roles** (`user`, `organizer`, `admin`).

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

## Autenticación con Passport.js

Toda la autenticación pasa por estrategias de Passport definidas en **`src/config/passport.config.js`**. `app.js` solo ejecuta `initializePassport()` y `passport.initialize()`; no contiene lógica de estrategias. No se usan sesiones de Passport (`session: false`): el estado vive en el JWT.

| Estrategia | Tipo                      | Usada en                      | Qué hace |
|------------|---------------------------|-------------------------------|----------|
| `register` | `passport-local`          | `POST /api/sessions/register` | Valida campos, normaliza el email, verifica unicidad, hashea la contraseña con bcrypt y crea el usuario con `role: "user"`. |
| `login`    | `passport-local`          | `POST /api/sessions/login`    | Busca el usuario y compara la contraseña con bcrypt. Si falla, responde siempre `Credenciales inválidas`. |
| `current`  | `passport-jwt`            | `GET /api/sessions/current`   | Lee el JWT de la cookie `currentUser`, verifica firma y expiración y deja `{ id, email, role }` en `req.user`. |

- Las rutas delegan en Passport mediante `passportCall(estrategia)` (`src/middlewares/passport.middleware.js`), un wrapper de `passport.authenticate(estrategia, { session: false }, callback)` que responde los errores en JSON.
- **El JWT lo genera el controller de login, no la estrategia**: la estrategia solo valida credenciales y el controller firma el token y setea la cookie.
- `POST /api/sessions/logout` no pasa por Passport: solo borra la cookie.

### Preparado para providers externos

`passport.config.js` registra las estrategias desde un único objeto `strategies`. Para sumar Google, GitHub u otro provider alcanza con instalar su estrategia (por ejemplo `passport-google-oauth20`), crearla en ese archivo y agregarla al objeto. **No hace falta tocar `app.js`.**

```js
const strategies = {
    register: registerStrategy,
    login: loginStrategy,
    current: currentStrategy,
    // google: new GoogleStrategy({ ... }, verify),
    // github: new GitHubStrategy({ ... }, verify),
};
```

---

## Rutas

| Método | Ruta                       | Descripción                                             | Protegida |
|--------|----------------------------|---------------------------------------------------------|-----------|
| GET    | `/api/health`              | Verifica que el servidor esté activo                    | No        |
| POST   | `/api/sessions/register`   | Registra un usuario (hashea la contraseña)              | No        |
| POST   | `/api/sessions/login`      | Valida credenciales y setea la cookie `currentUser`     | No        |
| GET    | `/api/sessions/current`    | Devuelve el usuario autenticado según el JWT            | Sí        |
| POST   | `/api/sessions/logout`     | Elimina la cookie `currentUser`                         | No        |

Además hay rutas de eventos, usuarios y tickets protegidas por rol (ver **Autorización por roles**). Las que todavía no están desarrolladas responden `501 Endpoint no implementado todavía`.

---

### `GET /api/health`

**Response `200`:**
```json
{ "status": "ok", "message": "Servidor activo" }
```

---

### `POST /api/sessions/register`

Estrategia `register`. Valida campos, normaliza el email (trim + minúsculas), rechaza duplicados y guarda la contraseña hasheada con bcrypt. El `role` no se acepta desde el body: siempre es `"user"`.

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

Estrategia `login`: busca el usuario por email y compara la contraseña con bcrypt. Si es correcta, el **controller** genera un JWT con payload `{ id, email, role }` firmado con `JWT_SECRET` y lo guarda en la cookie `currentUser` (`httpOnly: true`, `sameSite: 'lax'`, `maxAge: 3600000`, `secure` solo en producción).

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

Protegida con la estrategia `current` de Passport: lee la cookie `currentUser`, verifica el JWT y guarda `{ id, email, role }` en `req.user`.

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

## Roles y autorización

### Roles

| Rol         | Descripción                                                        |
|-------------|--------------------------------------------------------------------|
| `user`      | Rol por defecto al registrarse. Consulta eventos y compra tickets. |
| `organizer` | Crea eventos y modifica/cancela **solo los propios**.              |
| `admin`     | Modifica cualquier evento y administra usuarios.                   |

- El campo `role` del modelo `User` acepta `user`, `organizer` y `admin`, con default `user`.
- **El registro público no permite elegir rol**: aunque el body traiga `"role": "admin"`, se guarda `user`.
- Para asignar `organizer` o `admin` se edita el campo `role` en MongoDB (Atlas / Compass) y el usuario vuelve a hacer login (el rol viaja dentro del JWT).

### Matriz de permisos

| Acción                               | user | organizer | admin |
|--------------------------------------|:----:|:---------:|:-----:|
| Consultar eventos publicados         |  ✅  |    ✅     |  ✅   |
| Crear eventos                        |  ❌  |    ✅     |  ✅   |
| Modificar/cancelar eventos propios   |  ❌  |    ✅     |  ✅   |
| Modificar/cancelar cualquier evento  |  ❌  |    ❌     |  ✅   |
| Ver todos los usuarios               |  ❌  |    ❌     |  ✅   |
| Comprar tickets (no en eventos propios) |  ✅  |    ✅     |  ✅   |

La matriz está definida en código en **`src/config/roles.js`** (`ROLES` y `PERMISSIONS`). Las rutas usan esas constantes con el middleware `authorize(...)`, así los roles no quedan hardcodeados en cada ruta.

### Middlewares

| Middleware | Archivo | Qué hace |
|------------|---------|----------|
| `auth` | `src/middlewares/auth.middleware.js` | Lee el JWT de la cookie `currentUser` (estrategia `current` de Passport), lo valida y carga `{ id, email, role }` en `req.user`. Sin sesión válida → **401**. |
| `authorize(...roles)` | `src/middlewares/authorize.middleware.js` | Recibe los roles permitidos y los compara contra `req.user.role`. Rol no permitido → **403**. |
| `eventOwnership` | `src/middlewares/ownership.middleware.js` | Propiedad del recurso: `admin` puede modificar cualquier evento; `organizer` solo los que creó. Evento ajeno → **403**. También responde 400 (ID inválido) y 404 (no existe). |
| `ticketPermission` | `src/middlewares/ownership.middleware.js` | Impide comprar un ticket de un evento que organiza uno mismo → **403**. |

Orden en las rutas: `auth` → `authorize(...)` → (propiedad) → controller.

```js
router.post("/", auth, authorize(PERMISSIONS.CREATE_EVENT), createEvent);
router.put("/:eid", auth, authorize(PERMISSIONS.MANAGE_EVENT), eventOwnership, updateEvent);
```

### 401 vs 403

| Código  | Significado | Cuándo | Response |
|---------|-------------|--------|----------|
| **401 Unauthorized** | **No hay sesión**: no sabemos quién sos. | Sin cookie, token manipulado o expirado. | `{ "status": "error", "message": "No autenticado" }` |
| **403 Forbidden** | **Hay sesión pero no hay permiso**: sabemos quién sos, pero tu rol (o la propiedad del recurso) no te habilita. | `user` creando eventos, `organizer` en rutas de admin, `organizer` editando un evento ajeno. | `{ "status": "error", "message": "No tenés permisos para realizar esta acción" }` |

Ninguno de estos casos responde 500.

### Rutas protegidas

| Método | Ruta                       | Acceso                                          | Errores posibles |
|--------|----------------------------|-------------------------------------------------|------------------|
| GET    | `/api/sessions/current`    | Autenticado                                     | 401 |
| GET    | `/api/events`              | Autenticado (devuelve solo eventos publicados)  | 401 |
| GET    | `/api/events/:eid`         | Autenticado                                     | 401, 404 |
| POST   | `/api/events`              | `organizer`, `admin`                            | 401, 403, 400 |
| PUT    | `/api/events/:eid`         | `organizer` (solo propios), `admin` (cualquiera) | 401, 403, 400, 404 |
| DELETE | `/api/events/:eid`         | `organizer` (solo propios), `admin` (cualquiera) — cancela el evento | 401, 403, 404 |
| GET    | `/api/users`               | `admin` (ruta administrativa)                   | 401, 403 |
| POST   | `/api/tickets/:uid/:eid`   | Autenticado, excepto en eventos propios         | 401, 403, 404 |

Rutas pendientes (responden `501`): `GET /api/users/:email`, `PUT /api/users/:email`, `GET /api/tickets`, `GET /api/tickets/:tid`.

### `POST /api/events`

El `organizer` se toma del usuario logueado (`req.user.id`), no del body. Campos: `name`, `date`, `place`, `capacity`, `price`.

**Request (organizer o admin):**
```json
{ "name": "Congreso Tech 2026", "date": "2026-12-01", "place": "CABA", "capacity": 100, "price": 5000 }
```

**Response `201`:**
```json
{ "status": "success", "payload": { "id": "6690...", "name": "Congreso Tech 2026", "date": "2026-12-01T00:00:00.000Z", "place": "CABA", "capacity": 100, "price": 5000, "status": "active", "organizer": "665f2a..." } }
```

**Response `403`** (rol `user`):
```json
{ "status": "error", "message": "No tenés permisos para realizar esta acción" }
```

**Response `401`** (sin cookie):
```json
{ "status": "error", "message": "No autenticado" }
```

### `PUT /api/events/:eid`

Modifica `name`, `date`, `place`, `capacity` y/o `price` (no se puede cambiar `organizer` ni `status` desde el body).

**Request:**
```json
{ "price": 4000 }
```

**Response `200`:**
```json
{ "status": "success", "payload": { "id": "6690...", "name": "Congreso Tech 2026", "price": 4000, "status": "active", "organizer": "665f2a...", "...": "..." } }
```

**Response `403`** (organizer modificando un evento ajeno):
```json
{ "status": "error", "message": "Solo podés modificar tus propios eventos" }
```

### `DELETE /api/events/:eid`

Cancela el evento (baja lógica: `status: "cancelled"`); deja de aparecer en `GET /api/events`.

**Response `200`:**
```json
{ "status": "success", "message": "Evento cancelado", "payload": { "id": "6690...", "status": "cancelled", "...": "..." } }
```

### `GET /api/users` (admin)

**Response `200`** (sin `password`):
```json
{ "status": "success", "payload": [ { "id": "665f2a...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "role": "user" } ] }
```

**Response `403`** (organizer o user):
```json
{ "status": "error", "message": "No tenés permisos para realizar esta acción" }
```

### `POST /api/tickets/:uid/:eid`

**Response `201`:**
```json
{ "status": "success", "payload": { "id": "6abf...", "user": "665f2a...", "event": "6690..." } }
```

**Response `403`** (comprar en un evento propio):
```json
{ "status": "error", "message": "No podés comprar un ticket de tu propio evento" }
```

---

## Casos de prueba

**Autenticación**

1. Registro → login → `/current` (200) → logout → `/current` (401)
2. Registro con email duplicado → 409
3. Login con credenciales inválidas → 401 `Credenciales inválidas`

**Roles y autorización**

4. `POST /api/events` con rol `user` → **403**
5. `POST /api/events` con rol `organizer` → **201**
6. `GET /api/users` con rol `organizer` → **403**
7. `GET /api/users` con rol `admin` → **200**
8. Cualquier ruta privada sin cookie → **401**
9. `organizer` haciendo `PUT /api/events/:eid` sobre un evento ajeno → **403**

---

## Estructura

```
src/
├── app.js                            # Express + passport.initialize() (sin lógica de auth)
├── server.js                         # conecta a MongoDB y levanta el servidor
├── config/
│   ├── env.js                        # lee y valida variables de entorno
│   ├── db.js                         # conexión a MongoDB
│   ├── cookie.js                     # nombre y opciones de la cookie de auth
│   ├── passport.config.js            # estrategias register, login y current
│   └── roles.js                      # ROLES y matriz de PERMISSIONS
├── routes/
│   ├── sessions.router.js            # rutas que delegan en Passport
│   └── events.router.js              # aplica auth + authorize + eventOwnership
├── controllers/sessions.controller.js  # genera el JWT y setea/borra la cookie
├── middlewares/
│   ├── auth.middleware.js            # auth: valida JWT de la cookie → 401 si no hay sesión
│   ├── authorize.middleware.js       # authorize(...roles) → 403 si el rol no coincide
│   ├── ownership.middleware.js       # eventOwnership / ticketPermission (propiedad del recurso)
│   ├── passport.middleware.js        # passportCall: authenticate sin sesión + errores JSON
│   └── error.middleware.js           # manejador global de errores
├── repositories/                     # users / events / tickets: deciden qué datos devolver
├── dao/                              # users / events / tickets: acceso directo a Mongoose
├── models/                           # userModel, eventModel (con organizer), ticketModel
└── utils/
    ├── jwt.js                        # firma del JWT
    └── hash.js                       # bcrypt
```

Flujo: `router → passportCall(estrategia) → controller`, y las estrategias usan `repository → DAO → modelo`.
