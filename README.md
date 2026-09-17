Pre-entrega 1:MAXIMILIANO DOOLAN 

app.js configura Express (con express.json()); server.js levanta el servidor
Puerto configurable por variable de entorno
GET /api/health devuelve respuesta indicando que el servidor está activo
Estructura de carpetas (deben existir, aunque algunas estén vacías)

config/, routes/, controllers/, services/, repositories/, dao/, models/, middlewares/, utils/
Recursos

GET /api/events con ruta y controlador propios (puede devolver lista vacía)
Estructura inicial para sessions (ruta y controlador, sin lógica de auth)
Modelos

Archivo base para User (campos mínimos)
Archivo base para Event (campos mínimos)
Configuración y documentación

dotenv configurado; .env.example con PORT, NODE_ENV, MONGO_URL, JWT_SECRET
.gitignore que excluya .env y node_modules
README.md con: nombre del proyecto, temática elegida, tecnologías, instalación, configuración de variables, cómo ejecutar, estructura de carpetas, rutas disponibles
Módulos ESM (import/export)

1. Estructura de carpetas esperada:



proyecto-eventos/
├── src/
│   ├── app.js                # configura Express (NO levanta el server)
│   ├── server.js             # levanta el servidor
│   ├── config/
│   ├── routes/
│   │   ├── events.router.js
│   │   └── sessions.router.js
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── dao/
│   ├── models/
│   │   ├── User.js           # campos mínimos
│   │   └── Event.js          # campos mínimos
│   ├── middlewares/
│   └── utils/
├── .env.example              # PORT, NODE_ENV, MONGO_URL, JWT_SECRET
├── .gitignore                # excluye .env y node_modules
├── package.json
└── README.md
