# BackMD — API REST para plataforma de eventos

## Instalación

```bash
npm install
```

Crear un archivo `.env` en la raíz del proyecto basándose en `.env.example`:

```bash
cp .env.example .env
```

Completar las variables en `.env` y luego correr:

```bash
npm run dev
```

---

## Endpoint: `POST /api/sessions/register`

Registra un nuevo usuario. Hashea la contraseña con bcrypt antes de guardar. **No devuelve la contraseña en la respuesta.**

### Campos esperados (JSON body)

| Campo        | Tipo   | Requerido | Descripción                        |
|--------------|--------|-----------|------------------------------------|
| `first_name` | String | ✅        | Nombre del usuario                 |
| `last_name`  | String | ✅        | Apellido del usuario               |
| `email`      | String | ✅        | Email válido (se normaliza automáticamente) |
| `password`   | String | ✅        | Mínimo 6 caracteres                |

> El campo `role` **no se acepta desde el body**. Siempre se asigna `"user"` al registrarse.

---

## Casos de prueba (con Postman o Thunder Client)

### 1. Registro exitoso

**Request:**
```json
POST /api/sessions/register
{
  "first_name": "Ana",
  "last_name": "Pérez",
  "email": "Ana@Mail.com ",
  "password": "Secreta123"
}
```

**Response `201`:**
```json
{
  "status": "success",
  "payload": {
    "id": "665f2a...",
    "first_name": "Ana",
    "last_name": "Pérez",
    "email": "ana@mail.com",
    "role": "user"
  }
}
```

---

### 2. Campos faltantes

**Request:**
```json
{ "first_name": "Ana", "email": "ana@mail.com" }
```

**Response `400`:**
```json
{ "status": "error", "message": "Faltan campos obligatorios" }
```

---

### 3. Email con formato inválido

**Request:**
```json
{ "first_name": "Ana", "last_name": "Pérez", "email": "no-es-un-email", "password": "123456" }
```

**Response `400`:**
```json
{ "status": "error", "message": "Formato de email inválido" }
```

---

### 4. Email ya registrado

**Request:** (mismo email del caso 1, segundo intento)
```json
{ "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "password": "Secreta123" }
```

**Response `409`:**
```json
{ "status": "error", "message": "El email ya está registrado" }
```

---

### 5. Contraseña no está en texto plano (verificar en MongoDB)

En MongoDB Compass o Atlas, buscar el usuario guardado. El campo `password` debe verse similar a:
```
$2b$10$Kx8Z...  ← hash de bcrypt, nunca el texto original
```

---

### 6. La respuesta no devuelve la contraseña

Verificar en cualquier respuesta `201` que el objeto `payload` **no tenga** el campo `password`.

---

## Arquitectura en capas

```
ruta (router) → controller → service → repository → DAO → modelo (MongoDB)
```

- **router**: define la ruta y delega al controller
- **controller**: maneja HTTP (status codes, formato de respuesta)
- **service**: lógica de negocio (validación, normalización, hash)
- **repository**: abstracción del acceso a datos, decide qué devolver
- **DAO**: única capa que habla directamente con Mongoose
- **utils/hash.js**: helper reutilizable de bcrypt
