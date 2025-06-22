// src/common/interfaces/user-management.interface.ts

// ============== INTERFACES NUCLEO (Si no las tienes en un archivo compartido) ==============
// Estas interfaces deben ser consistentes con las entidades de tus microservicios y DTOs de GraphQL.
// Si ya las tienes en 'loginresponse.interface.ts', puedes simplemente importarlas y no redefinirlas aquí.
// Pero para claridad, asumo que las pondremos aquí si es el archivo principal de gestión.

export interface Permission {
  id: string; // UUID
  name: string;
  description?: string;
  // No hay createdAt/updatedAt en tu entidad Permission, así que no las incluimos aquí.
}

export interface Role {
  id: number; // <-- ¡CRÍTICO: ID de Rol es NUMBER según AssignPermissionsToRoleInput!
  name: string;
  description?: string;
  createdAt?: string; // Asumo que el microservicio devuelve fechas como strings ISO
  updatedAt?: string; // Asumo que el microservicio devuelve fechas como strings ISO
  permissions?: Permission[];
}

export interface User {
  id: string; // UUID (asumiendo esto para consistencia general, aunque algunos IDs pueden ser number)
  email: string;
  name?: string;
  lastName?: string;
  isActive?: boolean;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  role?: Role;
}
// ========================================================================================


// ========================= INTERFACES DE ENTRADA (GATEWAY -> MS) =========================

// DTO para crear un permiso (usado por el Gateway para enviar al MS de Permisos)
export interface CreatePermissionInput {
  name: string;
  description?: string;
}


// Respuesta del Microservicio de Permisos para crear/actualizar/eliminar un Permiso
export interface PermissionServiceResponse {
  data?: {
    createPermission?: Permission; // Para createPermission
    updatePermission?: Permission; // Para updatePermission
    removePermission?: Permission; // Para removePermission (el TypeORM remove retorna el objeto borrado)
    findPermissionById?: Permission; // Para findPermissionById
    findAllPermissions?: Permission[]; // Para findAllPermissions
  };
  errors?: any[];
}

// Respuesta del Microservicio de Permisos para asignar/remover permisos de un Rol
export interface RolePermissionsServiceResponse {
  data?: {
    assignPermissionsToRole?: Role; // Para assignPermissionsToRole
    removePermissionsFromRole?: Role; // Para removePermissionsFromRole
  };
  errors?: any[];
}

// ======================= RESULTADOS DEL ORQUESTADOR (GATEWAY -> FRONTEND) ======================

// Resultado para operaciones de Permisos individuales (crear, actualizar, eliminar, buscar)
export interface PermissionOrchestratorResult {
  statusCode: number;
  success: boolean;
  body: {
    permission?: Permission | null; // El permiso afectado
    permissions?: Permission[] | null; // Lista de permisos (para findAll)
    message?: string;
    errors?: any[];
  };
}

// Resultado para operaciones de asignación de permisos a roles
export interface AssignPermissionsOrchestratorResult {
  statusCode: number;
  success: boolean;
  body: {
    role?: Role | null; // El rol actualizado
    message?: string;
    errors?: any[];
  };
}