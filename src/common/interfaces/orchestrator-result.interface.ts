// src/common/interfaces/orchestrator-result.interface.ts (EN TU API GATEWAY)

export interface OrchestratorResult {
  statusCode?: number; // Código de estado HTTP de la operación
  body?: any; // Cuerpo de la respuesta exitosa (ej. los datos del rol creado)
  errors?: Array<{ message: string; [key: string]: any }>; // Array de objetos de error GraphQL o personalizados
  message?: string; // Un mensaje general descriptivo de la operación
}