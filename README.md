# BackMD — API REST para plataforma de eventos

Backend con **Node.js, Express, MongoDB (Mongoose)** organizado en **capas (Router → Controller → Service → Repository → DAO, con DTOs)**, autenticación centralizada con **Passport.js** (JWT en cookie HttpOnly), **autorización por roles** (`user`, `organizer`, `admin`) **CRUD de eventos** con reglas de negocio, filtros, paginación y ordenamiento, e **inscripciones (tickets)** con control de cupos y email de confirmación con **Nodemailer**.

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
| `MAIL_HOST`      | Servidor SMTP                                           | `smtp.gmail.com`                |
| `MAIL_PORT`      | Puerto SMTP (`587` STARTTLS, `465` SSL)                 | `587`                           |
| `MAIL_USER`      | Usuario SMTP (la cuenta que envía)                      | `tu_mail@gmail.com`             |
| `MAIL_PASS`      | Contraseña SMTP (en Gmail: **contraseña de aplicación**) | —                               |
| `MAIL_FROM`      | Remitente que ve el usuario                             | `"Plataforma de Eventos <tu_mail@gmail.com>"` |

> Las credenciales de email nunca están en el código: se leen de estas variables (`src/config/mailer.js`). Si faltan, la app arranca igual y avisa por consola que no se enviarán emails.

> El archivo `.env` **no** se sube al repositorio (está en `.gitignore`).

---

## Autenticación con Passport.js

Toda la autenticación pasa por estrategias de Passport definidas en **`src/config/passport.config.js`**. Las estrategias no contienen reglas de negocio: **delegan en `src/services/sessions.service.js`** (validación, normalización, unicidad, bcrypt), siguiendo la arquitectura en capas. `app.js` solo ejecuta `initializePassport()` y `passport.initialize()`; no contiene lógica de estrategias. No se usan sesiones de Passport (`session: false`): el estado vive en el JWT.

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

Las rutas de **eventos** están en [Eventos](#eventos) y las de **inscripciones** en [Tickets e inscripciones](#tickets-e-inscripciones). Usuarios se describe en **Roles y autorización**. Las que todavía no están desarrolladas responden `501 Endpoint no implementado todavía`.

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
| `user`      | Rol por defecto al registrarse. Consulta eventos y se inscribe.             |
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
| Inscribirse a eventos (no a los propios) |  ✅  |    ✅     |  ✅   |
| Ver y cancelar sus propios tickets   |  ✅  |    ✅     |  ✅   |
| Ver inscriptos de un evento          |  ❌  | ✅ (solo sus eventos) |  ✅   |
| Cancelar tickets de otros            |  ❌  |    ❌     |  ✅   |

La matriz está definida en código en **`src/config/roles.js`** (`ROLES` y `PERMISSIONS`). Las rutas usan esas constantes con el middleware `authorize(...)`, así los roles no quedan hardcodeados en cada ruta.

### Middlewares

| Middleware | Archivo | Qué hace |
|------------|---------|----------|
| `auth` | `src/middlewares/auth.middleware.js` | Lee el JWT de la cookie `currentUser` (estrategia `current` de Passport), lo valida y carga `{ id, email, role }` en `req.user`. Sin sesión válida → **401**. |
| `optionalAuth` | `src/middlewares/auth.middleware.js` | Para rutas públicas: si hay sesión válida carga `req.user`, si no sigue sin error (así el organizer ve sus borradores). |
| `authorize(...roles)` | `src/middlewares/authorize.middleware.js` | Recibe los roles permitidos y los compara contra `req.user.role`. Rol no permitido → **403**. |
| `eventOwnership` | `src/middlewares/ownership.middleware.js` | Propiedad del evento: `admin` puede gestionar cualquiera; `organizer` solo los que creó (editar, cambiar estado, ver inscriptos). Evento ajeno → **403**. También responde 400 (ID inválido) y 404 (no existe). |
| `ticketOwnership` | `src/middlewares/ownership.middleware.js` | Propiedad del ticket: solo su dueño o un `admin` pueden cancelarlo. Ticket ajeno → **403**. También 400 / 404. |

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
| POST   | `/api/events/:eid/tickets` | Autenticado (no a eventos propios)              | 401, 403, 400, 404, 409 |
| GET    | `/api/tickets/my-tickets`  | Autenticado (solo los propios)                  | 401 |
| GET    | `/api/events/:eid/tickets` | `organizer` dueño del evento o `admin`          | 401, 403, 404 |
| PATCH  | `/api/tickets/:tid/cancel` | Dueño del ticket o `admin`                      | 401, 403, 404, 409 |

Rutas pendientes (responden `501`): `GET /api/users/:email`, `PUT /api/users/:email`.

### `GET /api/users` (admin)

**Response `200`** (sin `password`):
```json
{ "status": "success", "payload": [ { "id": "665f2a...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "role": "user" } ] }
```

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
| 403 | Organizer modificando un evento ajeno | `Solo podés gestionar tus propios eventos` |
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
| 403 | Evento ajeno (organizer) | `Solo podés gestionar tus propios eventos` |

Para **cancelar**: `{ "status": "cancelled" }`.

---

## Tickets e inscripciones

### Modelo `Ticket`

| Campo             | Tipo     | Descripción |
|-------------------|----------|-------------|
| `user`            | ObjectId | **Referencia** al `User` inscripto |
| `event`           | ObjectId | **Referencia** al `Event` |
| `status`          | String   | `confirmed` · `pending` · `cancelled` |
| `quantity`        | Number   | Cantidad de entradas (entero > 0, máximo 10) |
| `reservationCode` | String   | Código único, ej. `TCK-8F3A2C1B` |
| `createdAt`       | Date     | Fecha de la inscripción (automático) |
| `cancelledAt`     | Date     | Fecha de cancelación (`null` si está activo) |

Sin objetos embebidos: `user` y `event` son solo referencias.

### Estados del ticket

| Estado      | Significado | ¿Ocupa cupo? |
|-------------|-------------|:------------:|
| `confirmed` | Inscripción confirmada. Es el estado con el que se crea. | ✅ |
| `pending`   | Reserva a confirmar (queda preparado para cuando haya pagos). | ✅ |
| `cancelled` | Cancelada por el usuario o un admin. **No se elimina** el documento. | ❌ |

### Endpoints

| Método | Ruta                       | Acceso                                 | Descripción |
|--------|----------------------------|----------------------------------------|-------------|
| POST   | `/api/events/:eid/tickets` | Autenticado                            | Inscribirse a un evento |
| GET    | `/api/tickets/my-tickets`  | Autenticado (propios)                  | Mis tickets, con `title`, `date` y `location` del evento |
| GET    | `/api/events/:eid/tickets` | `organizer` (sus eventos) o `admin`    | Inscriptos de un evento + resumen de cupos |
| PATCH  | `/api/tickets/:tid/cancel` | Dueño del ticket o `admin`             | Cancelar un ticket |

### Flujo de inscripción

Todas las validaciones viven en **`src/services/tickets.service.js`** (no en rutas ni controllers). En orden:

1. `quantity` válida: entero > 0 (default `1`, máximo `10`) → si no, **400**.
2. El evento existe → si no, **404**.
3. El evento está **publicado**: si está `cancelled`, `finished` o `draft` → **409**. Si ya pasó su fecha → **409**.
4. El usuario no es el organizador del evento → si lo es, **403**.
5. **Una inscripción activa por usuario y evento**: si ya tiene un ticket `confirmed`/`pending` para ese evento → **409** (puede pedir varias entradas con `quantity` en una misma inscripción).
6. **Hay cupo suficiente** (ver regla de cupos) → si no, **409** con cuántos lugares quedan.
7. Se crea el ticket con `status: "confirmed"` y un `reservationCode` único.
8. Se envía el **email de confirmación** con Nodemailer. Si el envío falla, la inscripción **igual queda guardada** y la respuesta trae `emailSent: false`.

### Regla de cupos

```
cupos ocupados   = suma de quantity de los tickets del evento con status confirmed o pending
cupos disponibles = capacity del evento − cupos ocupados
```

- Los tickets **`cancelled` no se cuentan**, así que al cancelar un ticket el cupo **queda libre automáticamente**, sin tocar el evento.
- Se rechaza la inscripción si `quantity` > cupos disponibles.

### Cancelación: `PATCH /api/tickets/:tid/cancel`

- Valida que el ticket exista (404), que sea del solicitante o que este sea `admin` (403, middleware `ticketOwnership`) y que no esté ya cancelado (409).
- Cambia `status` a `cancelled` y guarda `cancelledAt`. **No elimina** el documento.

### Email de confirmación

- Se configura con `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` y `MAIL_FROM` (ver [Variables de entorno](#variables-de-entorno)).
- Se envía al email del usuario logueado e incluye: evento, código de reserva, cantidad de entradas, fecha y lugar.
- **Con Gmail:** activá la verificación en 2 pasos en tu cuenta de Google, creá una **contraseña de aplicación** en https://myaccount.google.com/apppasswords y usala como `MAIL_PASS` (con `MAIL_HOST=smtp.gmail.com` y `MAIL_PORT=587`).

### Ejemplos

**`POST /api/events/:eid/tickets`** — Request:
```json
{ "quantity": 2 }
```

Response `201`:
```json
{
  "status": "success",
  "message": "Inscripción confirmada. Te enviamos un email con los datos.",
  "emailSent": true,
  "payload": {
    "id": "6ad7...",
    "user": "665f2a...",
    "event": "6690...",
    "status": "confirmed",
    "quantity": 2,
    "reservationCode": "TCK-BC8AA305",
    "cancelledAt": null,
    "createdAt": "2026-10-20T19:00:00.000Z"
  }
}
```

| Status | Caso | Mensaje |
|--------|------|---------|
| 401 | Sin sesión | `No autenticado` |
| 404 | Evento inexistente | `Evento no encontrado` |
| 409 | Evento cancelado / finalizado / borrador | `El evento está cancelado` · `El evento ya finalizó` · `El evento todavía no está publicado` |
| 409 | Sin cupo suficiente | `No hay cupo suficiente: pediste 2 y quedan 1` · `No hay cupos disponibles para este evento` |
| 409 | Inscripción duplicada | `Ya tenés una inscripción activa para este evento (código TCK-...)` |
| 400 | `quantity` inválida | `La cantidad (quantity) debe ser un número entero mayor a 0` |
| 403 | Inscribirse al evento propio | `No podés inscribirte a tu propio evento` |

**`GET /api/tickets/my-tickets`** — Response `200` (no incluye datos de otros usuarios):
```json
{
  "status": "success",
  "payload": [
    {
      "id": "6ad7...",
      "status": "confirmed",
      "quantity": 2,
      "reservationCode": "TCK-BC8AA305",
      "cancelledAt": null,
      "createdAt": "2026-10-20T19:00:00.000Z",
      "event": { "id": "6690...", "title": "Taller de Node", "date": "2027-03-10T00:00:00.000Z", "location": "CABA", "status": "published" }
    }
  ]
}
```

**`GET /api/events/:eid/tickets`** (organizer dueño o admin) — Response `200`:
```json
{
  "status": "success",
  "payload": {
    "event": { "id": "6690...", "title": "Taller de Node", "status": "published", "capacity": 30, "reserved": 2, "available": 28 },
    "tickets": [
      { "id": "6ad7...", "status": "confirmed", "quantity": 2, "reservationCode": "TCK-BC8AA305", "user": { "id": "665f...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com" } }
    ]
  }
}
```
`403` si lo pide un `user` (`No tenés permisos para realizar esta acción`) o un `organizer` de otro evento (`Solo podés gestionar tus propios eventos`).

**`PATCH /api/tickets/:tid/cancel`** — Response `200`:
```json
{ "status": "success", "message": "Ticket cancelado", "payload": { "id": "6ad7...", "status": "cancelled", "cancelledAt": "2026-10-21T10:00:00.000Z", "...": "..." } }
```

| Status | Caso | Mensaje |
|--------|------|---------|
| 403 | Ticket ajeno (no admin) | `Solo podés cancelar tus propios tickets` |
| 404 | No existe | `Ticket no encontrado` |
| 409 | Ya cancelado | `El ticket ya está cancelado` |

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

**Tickets e inscripciones**

16. Inscripción exitosa → **201** y llega el email de confirmación
17. Inscripción sin sesión → **401**
18. Inscripción a evento inexistente → **404**
19. Inscripción a evento cancelado o finalizado → **409**
20. Inscripción sin cupo suficiente → **409** (`No hay cupo suficiente: pediste X y quedan Y`)
21. Inscripción duplicada activa → **409**
22. Cancelación propia → **200**, y el cupo liberado permite una nueva inscripción
23. Cancelar un ticket ajeno como `user` → **403**
24. `GET /api/events/:eid/tickets` como `user` → **403**
25. `GET /api/events/:eid/tickets` como `organizer` de otro evento → **403**

**Arquitectura (DAO / Repository / DTO)**

26. Flujo completo: registro → login → crear evento → inscribirse → mis tickets → cancelar
27. `/api/sessions/current` no incluye `password`
28. `GET /api/events/:eid/tickets` (con `populate` del usuario) no incluye `password`
29. Un error de negocio (ej. inscripción duplicada) devuelve **409**, no 500
30. Ruta protegida sin sesión → **401**; con sesión pero sin permisos → **403**
31. Ruta inexistente → **404** en JSON

---

## Arquitectura en capas

La API está organizada en capas con una sola responsabilidad cada una. Un request recorre:

```
Request → Router → Middlewares → Controller → Service → Repository → DAO → Modelo (MongoDB)
                                      ↑            │
                                      └──── DTO ◄──┘   (la respuesta sale siempre por un DTO)
```

| Capa | Carpeta | Responsabilidad | Qué NO hace |
|------|---------|-----------------|-------------|
| **Router** | `src/routes/` | Define método + ruta y encadena middlewares y controller. | No tiene lógica. |
| **Middlewares** | `src/middlewares/` | `auth` (401), `authorize(...roles)` (403), guardias de propiedad (`eventOwnership`, `ticketOwnership`, que consultan al service), `passportCall` y manejo centralizado de errores. | No acceden a la base de datos directamente. |
| **Controller** | `src/controllers/` | Extrae `body`, `params`, `query` y `req.user`, llama al service y devuelve la respuesta con su código HTTP. | No importa modelos, no calcula cupos, no valida estados ni reglas de negocio. |
| **Service** | `src/services/` | **Toda la lógica de negocio**: validaciones, cupos, estados y transiciones, duplicados, permisos sobre recursos propios, registro/login, envío de email. Devuelve DTOs. Lanza `HttpError` con el código correcto. | No importa DAOs ni modelos: solo repositories. |
| **Repository** | `src/repositories/` | Métodos **orientados al dominio** sobre el DAO: `findByEmail`, `findByEmailWithPassword`, `findEvents`, `findPublishedEvents`, `updateStatus`, `countActiveTickets`, `findActiveByUserAndEvent`, `cancelTicket`... Decide qué datos de los documentos relacionados se populan. | No importa modelos. |
| **DAO** | `src/dao/` | Acceso a datos genérico: `findById`, `findOne`, `find`, `create`, `update`, `count`, `sum`. `BaseDAO` implementa las operaciones y `UserDAO`, `EventDAO` y `TicketDAO` lo extienden. | **Son los únicos archivos que importan modelos de Mongoose.** Sin lógica de negocio. |
| **Modelo** | `src/models/` | Schemas de Mongoose (`User`, `Event`, `Ticket`). | — |
| **DTO** | `src/dto/` | Dan forma a cada respuesta y filtran datos sensibles, también en documentos populados. | — |

### DTOs

| DTO | Se usa en | Campos |
|-----|-----------|--------|
| `UserDTO` | Registro, `GET /api/users` | `id`, `first_name`, `last_name`, `email`, `role` |
| `CurrentUserDTO` | `/api/sessions/current` y payload del JWT | `id`, `email`, `role` |
| `PublicUserDTO` | Usuario populado (organizador de un evento, inscripto de un ticket) | `id`, `first_name`, `last_name`, `email` |
| `EventDTO` | Respuestas de eventos | todos los campos del evento; `organizer` como id o `PublicUserDTO` si está populado |
| `EventSummaryDTO` | Evento populado dentro de un ticket | `id`, `title`, `date`, `location`, `status` |
| `TicketDTO` | Respuestas de tickets/inscripciones | `id`, `user`, `event`, `status`, `quantity`, `reservationCode`, `cancelledAt`, `createdAt`, `updatedAt` (en "mis tickets" se omite `user`) |

**Ninguna respuesta expone `password`**, ni siquiera hasheada. Además, el campo tiene `select: false` en el modelo: solo se lee explícitamente (`findByEmailWithPassword`) para validar el login.

### Manejo de errores

Todos los errores tienen el mismo formato y los resuelve el middleware centralizado `src/middlewares/error.middleware.js`:

```json
{ "status": "error", "message": "Descripción del error" }
```

| Código | Cuándo |
|--------|--------|
| **400** | Datos inválidos (campos faltantes, fecha pasada, `quantity` inválida, ID mal formado, JSON roto) |
| **401** | No autenticado (sin cookie, token inválido o expirado, credenciales incorrectas) |
| **403** | Autenticado pero sin permisos (rol no permitido o recurso ajeno) |
| **404** | Recurso o ruta inexistente |
| **409** | Conflicto con el estado actual (email duplicado, inscripción duplicada, sin cupo, transición de estado no permitida, evento cancelado) |
| **500** | Error interno inesperado (se registra en consola y no se exponen detalles) |

Los services lanzan `HttpError(status, message)` (`src/utils/errors.js`) y el middleware lo traduce. Los errores de negocio nunca terminan en 500.

## Estructura

```
src/
├── app.js                            # Express + passport.initialize() + middlewares de error
├── server.js                         # conecta a MongoDB y levanta el servidor
├── config/
│   ├── env.js                        # lee y valida variables de entorno
│   ├── db.js                         # conexión a MongoDB
│   ├── cookie.js                     # nombre y opciones de la cookie de auth
│   ├── passport.config.js            # estrategias register, login y current (delegan en sessions.service)
│   ├── mailer.js                     # transporter de Nodemailer (credenciales desde .env)
│   └── roles.js                      # ROLES y matriz de PERMISSIONS
├── constants/
│   └── status.js                     # EVENT_STATUS, TICKET_STATUS, ACTIVE_TICKET_STATUSES
├── routes/                           # sessions, events (+ /:eid/tickets), tickets, users, root
├── middlewares/
│   ├── auth.middleware.js            # auth (401) y optionalAuth (rutas públicas)
│   ├── authorize.middleware.js       # authorize(...roles) → 403
│   ├── ownership.middleware.js       # eventOwnership / ticketOwnership → consultan al service
│   ├── passport.middleware.js        # passportCall: authenticate sin sesión + errores JSON
│   └── error.middleware.js           # notFoundHandler (404) + errorHandler centralizado
├── controllers/                      # sessions, event, ticket, user, root: solo request/response
├── services/
│   ├── sessions.service.js           # registro y validación de credenciales
│   ├── users.service.js              # listado de usuarios
│   ├── events.service.js             # reglas de eventos, filtros, paginación, transiciones, propiedad
│   ├── tickets.service.js            # inscripción, cupos, duplicados, cancelación, propiedad
│   └── mail.service.js               # email de confirmación
├── repositories/
│   ├── users.repository.js           # UserRepository
│   ├── events.repository.js          # EventRepository
│   └── tickets.repository.js         # TicketRepository
├── dao/
│   ├── base.dao.js                   # BaseDAO: findById, findOne, find, create, update, count, sum
│   ├── users.dao.js                  # UserDAO
│   ├── events.dao.js                 # EventDAO
│   └── tickets.dao.js                # TicketDAO
├── dto/
│   ├── user.dto.js                   # UserDTO, CurrentUserDTO, PublicUserDTO
│   ├── event.dto.js                  # EventDTO, EventSummaryDTO
│   └── ticket.dto.js                 # TicketDTO
├── models/                           # userModel, eventModel, ticketModel
└── utils/
    ├── jwt.js                        # firma del JWT
    ├── hash.js                       # bcrypt
    ├── errors.js                     # HttpError
    └── validators.js                 # isValidId, isNonEmptyString
```
