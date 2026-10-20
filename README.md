# BackMD — API REST para plataforma de eventos

Backend con **Node.js, Express, MongoDB (Mongoose)**, autenticación centralizada con **Passport.js** (JWT en cookie HttpOnly), **autorización por roles** (`user`, `organizer`, `admin`) y **CRUD de eventos** con reglas de negocio, filtros, paginación y ordenamiento.

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

Las rutas de **eventos** están en la sección [Eventos](#eventos). Usuarios y tickets se describen en **Roles y autorización**. Las que todavía no están desarrolladas responden `501 Endpoint no implementado todavía`.

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
| `user`      | Rol por defecto al registrarse. Consulta eventos y compra tickets.          |
| `organizer` | Crea eventos y modifica/cambia el estado **solo de los propios**.           |
| `admin`     | Modifica cualquier evento y administra usuarios.                            |

- El campo `role` del modelo `User` acepta `user`, `organizer` y `admin`, con default `user`.
- **El registro público no permite elegir rol**: aunque el body traiga `"role": "admin"`, se guarda `user`.
- Para asignar `organizer` o `admin` se edita el campo `role` en MongoDB (Atlas / Compass) y el usuario vuelve a hacer login (el rol viaja dentro del JWT).

### Matriz de permisos

| Acción                               | user | organizer | admin |
|--------------------------------------|:----:|:---------:|:-----:|
| Consultar eventos publicados (público, sin login) |  ✅  |    ✅     |  ✅   |
| Ver borradores propios               |  ❌  |    ✅     |  ✅ (todos) |
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
| `optionalAuth` | `src/middlewares/auth.middleware.js` | Para rutas públicas: si hay sesión válida carga `req.user`, si no sigue sin error (así el organizer ve sus borradores). |
| `authorize(...roles)` | `src/middlewares/authorize.middleware.js` | Recibe los roles permitidos y los compara contra `req.user.role`. Rol no permitido → **403**. |
| `eventOwnership` | `src/middlewares/ownership.middleware.js` | Propiedad del recurso: `admin` puede modificar cualquier evento; `organizer` solo los que creó. Evento ajeno → **403**. También responde 400 (ID inválido) y 404 (no existe). |
| `ticketPermission` | `src/middlewares/ownership.middleware.js` | El evento debe estar publicado (409) e impide comprar un ticket de un evento propio → **403**. |

Orden en las rutas: `auth` → `authorize(...)` → (propiedad) → controller.

```js
router.post("/", auth, authorize(PERMISSIONS.CREATE_EVENT), createEvent);
router.put("/:id", auth, authorize(PERMISSIONS.MANAGE_EVENT), eventOwnership, updateEvent);
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
| POST   | `/api/events`              | `organizer`, `admin`                            | 401, 403, 400 |
| PUT    | `/api/events/:id`          | Dueño del evento o `admin`                      | 401, 403, 400, 404, 409 |
| PATCH  | `/api/events/:id/status`   | Dueño del evento o `admin`                      | 401, 403, 400, 404, 409 |
| GET    | `/api/users`               | `admin` (ruta administrativa)                   | 401, 403 |
| POST   | `/api/tickets/:uid/:eid`   | Autenticado, evento publicado y no propio       | 401, 403, 404, 409 |

Rutas pendientes (responden `501`): `GET /api/users/:email`, `PUT /api/users/:email`, `GET /api/tickets`, `GET /api/tickets/:tid`.

### `GET /api/users` (admin)

**Response `200`** (sin `password`):
```json
{ "status": "success", "payload": [ { "id": "665f2a...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "role": "user" } ] }
```

### `POST /api/tickets/:uid/:eid`

Solo eventos con `status: "published"`.

**Response `201`:**
```json
{ "status": "success", "payload": { "id": "6abf...", "user": "665f2a...", "event": "6690..." } }
```

| Status | Caso |
|--------|------|
| 403 | Comprar en un evento propio (`No podés comprar un ticket de tu propio evento`) |
| 409 | El evento no está publicado (`Solo se pueden comprar tickets de eventos publicados`) |

---

## Eventos

### Modelo `Event`

| Campo         | Tipo     | Reglas |
|---------------|----------|--------|
| `title`       | String   | Obligatorio |
| `description` | String   | Obligatorio |
| `category`    | String   | Obligatorio (se guarda en minúsculas, ej. `workshop`) |
| `date`        | Date     | Obligatorio, no puede ser pasada |
| `location`    | String   | Obligatorio |
| `capacity`    | Number   | Entero **> 0** |
| `price`       | Number   | **≥ 0** |
| `status`      | String   | `draft` · `published` · `cancelled` · `finished` (default `draft`) |
| `organizer`   | ObjectId | **Referencia** al `User` que lo creó (no se embebe). Se asigna desde `req.user`; nunca viene del body |

Además tiene `createdAt` y `updatedAt` automáticos.

### Endpoints

| Método | Ruta                      | Acceso                     | Descripción |
|--------|---------------------------|----------------------------|-------------|
| POST   | `/api/events`             | `organizer`, `admin`       | Crea un evento (queda en `draft`) |
| GET    | `/api/events`             | **Público**                | Lista con filtros, paginación y orden |
| GET    | `/api/events/:id`         | **Público**                | Detalle de un evento (con el organizador populado) |
| PUT    | `/api/events/:id`         | Dueño del evento o `admin` | Modifica datos del evento |
| PATCH  | `/api/events/:id/status`  | Dueño del evento o `admin` | Cambia el estado (publicar, cancelar, finalizar) |

> Los **borradores** (`draft`) no son públicos: solo los ven su organizador y los `admin` (con sesión iniciada). Para el resto, un borrador responde como inexistente (404).

### Reglas de negocio

Todas viven en **`src/services/events.service.js`** (no en rutas ni controllers):

1. **No se permite fecha pasada** al crear ni al modificar la fecha → 400.
2. **`capacity` ≤ 0 o `price` < 0** se rechazan → 400. `title`, `description`, `category` y `location` son obligatorios → 400.
3. **`organizer` y `status` no se aceptan desde el body**: el organizador sale de `req.user` y el estado se cambia solo con `PATCH /status`.
4. **Transiciones de estado permitidas** (cualquier otra → 409):

   | Desde       | Puede pasar a              |
   |-------------|----------------------------|
   | `draft`     | `published`, `cancelled`   |
   | `published` | `cancelled`, `finished`    |
   | `cancelled` | — (estado final)           |
   | `finished`  | — (estado final)           |

   Por lo tanto **no se puede publicar un evento cancelado o finalizado**. Tampoco se puede publicar un borrador cuya fecha ya pasó → 400.
5. **Un evento cancelado o finalizado no se puede modificar** (`PUT`) → 409. *Justificación de incluir `finished`: un evento que ya ocurrió no debería cambiar sus datos (fecha, precio, cupo), porque son el registro de lo que pasó y de lo que se vendió.*
6. **Cancelar = cambiar `status` a `cancelled`**. Los eventos **nunca se eliminan físicamente** (no existe `DELETE`).
7. **Propiedad**: un `organizer` solo puede modificar o cambiar el estado de sus eventos (403 si es ajeno); un `admin` puede cualquiera. Esto lo valida el middleware `eventOwnership`.

### Listado: `GET /api/events`

| Parámetro  | Ejemplo                  | Descripción |
|------------|--------------------------|-------------|
| `status`   | `published`              | Filtra por estado (`draft` solo devuelve los visibles para quien consulta) |
| `category` | `workshop`               | Categoría exacta (no distingue mayúsculas) |
| `location` | `caba`                   | Busca el texto dentro de la ubicación (no distingue mayúsculas) |
| `dateFrom` | `2026-11-01`             | Desde esa fecha (inclusive) |
| `dateTo`   | `2026-12-31`             | Hasta esa fecha (inclusive) |
| `page`     | `2`                      | Página (default `1`) |
| `limit`    | `5`                      | Resultados por página (default `10`, máximo `50`) |
| `sort`     | `date` · `-date` · `price` · `-price` · `title` · `capacity` · `createdAt` | Orden (con `-` es descendente). Default `date` |

Valores inválidos (estado inexistente, `page=0`, `sort` no permitido, `dateFrom` posterior a `dateTo`, fechas mal escritas) → 400.

**Request:** `GET /api/events?status=published&category=workshop&page=2&limit=5`

**Response `200`:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "6690...",
      "title": "Taller de Node",
      "description": "Intro a Express",
      "category": "workshop",
      "date": "2027-01-06T00:00:00.000Z",
      "location": "CABA",
      "capacity": 30,
      "price": 1000,
      "status": "published",
      "organizer": { "id": "665f2a...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com" },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "page": 2,
  "limit": 5,
  "total": 12,
  "totalPages": 3
}
```

### `POST /api/events` (organizer / admin)

**Request:**
```json
{ "title": "Taller de Node", "description": "Intro a Express", "category": "workshop", "date": "2027-03-10", "location": "CABA", "capacity": 30, "price": 1000 }
```

**Response `201`:**
```json
{ "status": "success", "payload": { "id": "6690...", "title": "Taller de Node", "category": "workshop", "status": "draft", "organizer": "665f2a...", "...": "..." } }
```

| Status | Caso | Mensaje |
|--------|------|---------|
| 401 | Sin sesión | `No autenticado` |
| 403 | Rol `user` | `No tenés permisos para realizar esta acción` |
| 400 | Fecha pasada | `La fecha del evento no puede ser pasada` |
| 400 | `capacity: 0` | `La capacidad debe ser un número entero mayor a 0` |
| 400 | `price: -1` | `El precio debe ser un número mayor o igual a 0` |
| 400 | Falta un campo | `El campo "title" es obligatorio` |

### `GET /api/events/:id` (público)

**Response `200`:** `{ "status": "success", "payload": { ...evento con organizer populado } }`

| Status | Caso |
|--------|------|
| 404 | El evento no existe (o es un borrador ajeno) → `Evento no encontrado` |
| 400 | ID mal formado → `ID de evento inválido` |

### `PUT /api/events/:id` (dueño o admin)

Campos editables: `title`, `description`, `category`, `date`, `location`, `capacity`, `price`.

**Request:**
```json
{ "price": 1500, "location": "Rosario" }
```

**Response `200`:** `{ "status": "success", "payload": { ...evento actualizado } }`

| Status | Caso | Mensaje |
|--------|------|---------|
| 403 | Organizer modificando un evento ajeno | `Solo podés modificar tus propios eventos` |
| 409 | Evento cancelado o finalizado | `No se puede modificar un evento cancelado` |
| 400 | Body sin campos editables / datos inválidos | `No hay campos para actualizar...` |
| 404 | No existe | `Evento no encontrado` |

### `PATCH /api/events/:id/status` (dueño o admin)

**Request:**
```json
{ "status": "published" }
```

**Response `200`:** `{ "status": "success", "payload": { ...evento con el nuevo status } }`

| Status | Caso | Mensaje |
|--------|------|---------|
| 409 | Transición no permitida (ej. cancelado → publicado) | `No se puede pasar un evento de "cancelled" a "published"` |
| 409 | Ya está en ese estado | `El evento ya está en estado "published"` |
| 400 | Estado inexistente | `Estado inválido. Opciones: draft, published, cancelled, finished` |
| 400 | Publicar con fecha pasada | `No se puede publicar un evento con fecha pasada` |
| 403 | Evento ajeno (organizer) | `Solo podés modificar tus propios eventos` |

Para **cancelar**: `{ "status": "cancelled" }`.

---

## Casos de prueba

**Autenticación**

1. Registro → login → `/current` (200) → logout → `/current` (401)
2. Registro con email duplicado → 409
3. Login con credenciales inválidas → 401 `Credenciales inválidas`

**Roles y autorización**

4. `GET /api/users` con rol `organizer` → **403**
5. `GET /api/users` con rol `admin` → **200**
6. Cualquier ruta privada sin cookie → **401**

**Eventos**

7. Crear evento con rol `user` → **403**
8. Crear evento con fecha pasada → **400**
9. Crear evento con `capacity: 0` → **400**
10. `organizer` modifica un evento propio → **200**
11. `organizer` modifica un evento ajeno → **403**
12. `admin` modifica un evento de otro organizador → **200**
13. Cambiar el estado de un evento cancelado → **409**
14. `GET /api/events?status=published&category=workshop&page=2&limit=5` → **200** con `data`, `page`, `limit`, `total`, `totalPages`
15. Consultar un evento inexistente → **404**

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
│   └── events.router.js              # públicas + auth/authorize/eventOwnership
├── controllers/                      # solo request/response
│   ├── sessions.controller.js        # genera el JWT y setea/borra la cookie
│   └── event.controller.js           # delega en events.service
├── services/
│   └── events.service.js             # reglas de negocio, filtros, paginación, transiciones
├── middlewares/
│   ├── auth.middleware.js            # auth (401 si no hay sesión) y optionalAuth (rutas públicas)
│   ├── authorize.middleware.js       # authorize(...roles) → 403 si el rol no coincide
│   ├── ownership.middleware.js       # eventOwnership / ticketPermission (propiedad del recurso)
│   ├── passport.middleware.js        # passportCall: authenticate sin sesión + errores JSON
│   └── error.middleware.js           # manejador global de errores
├── repositories/                     # users / events / tickets: deciden qué datos devolver
├── dao/                              # users / events / tickets: acceso directo a Mongoose
├── models/                           # userModel, eventModel (organizer como referencia), ticketModel
└── utils/
    ├── jwt.js                        # firma del JWT
    ├── hash.js                       # bcrypt
    └── errors.js                     # HttpError (errores de negocio con status)
```

Flujo: `router → middlewares (auth / authorize / ownership) → controller → service → repository → DAO → modelo`.
