// src/common/interfaces/role.interface.ts

// Interfaz para el payload de entrada de la creación de un rol
export interface CreateRoleInput {
  name: string;
  description?: string; // Opcional si tu esquema GraphQL lo permite
  // Añade otras propiedades si tu mutación createRole las requiere (ej: permissionsIds)
  // permissionsIds?: string[];
}

// Interfaz para la respuesta de un rol creado
export interface Role {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // Tipo de fecha como string ISO
  updatedAt: string; // Tipo de fecha como string ISO
  // Si tu esquema de rol tiene permisos en la respuesta, añádelos:
  // permissions?: Permission[];
}

export interface CreateRoleOrchestratorResult {
  statusCode: number;
  success: boolean;
  body: {
    message?: string;
    errors?: { message: string }[];
    role?: Role; // El rol creado si la operación fue exitosa
  };
}

// Interfaz para la respuesta del microservicio de roles (GraphQL)
export interface CreateRoleServiceResponse {
  data?: {
    createRole: Role;
  };
  errors?: any[]; // Errores GraphQL del microservicio
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
}