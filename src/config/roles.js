// Roles del sistema
export const ROLES = Object.freeze({
    USER: "user",
    ORGANIZER: "organizer",
    ADMIN: "admin",
});

// Matriz de permisos: acción → roles que pueden realizarla.
// (Consultar eventos es público, por eso no figura acá.)
// Las rutas usan estas constantes con el middleware authorize(...),
// así los roles no quedan hardcodeados en cada ruta.
export const PERMISSIONS = Object.freeze({
    CREATE_EVENT:    [ROLES.ORGANIZER, ROLES.ADMIN],
    MANAGE_EVENT:    [ROLES.ORGANIZER, ROLES.ADMIN],             // modificar/cambiar estado (organizer: solo propios)
    MANAGE_ANY_EVENT:[ROLES.ADMIN],                              // modificar cualquier evento
    VIEW_USERS:      [ROLES.ADMIN],
    BUY_TICKET:      [ROLES.USER, ROLES.ORGANIZER, ROLES.ADMIN], // no en eventos propios
});
