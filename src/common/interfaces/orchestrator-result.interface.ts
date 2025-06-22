// src/common/interfaces/orchestrator-result.interface.ts (EN TU API GATEWAY)

// src/common/interfaces/orchestrator-result.interface.ts (EN TU API GATEWAY)

export interface OrchestratorResult<T = any> { // <-- ¡Añadido el genérico T!
  statusCode?: number; // Código de estado HTTP de la operación
  body?: T; // <-- Ahora el body es de tipo T
  errors?: Array<{ message: string; [key: string]: any }>; // Array de objetos de error GraphQL o personalizados
  message?: string; // Un mensaje general descriptivo de la operación
  success?: boolean; // ¡No olvides esta propiedad si la usas en tu servicio!
}

export interface OrchestratorError {
  message: string;
  code?: string; // Opcional: un código de error específico
  path?: string[]; // Opcional: para errores GraphQL
  locations?: any[]; // Opcional: para errores GraphQL
  extensions?: any; // Opcional: para errores GraphQL
}
