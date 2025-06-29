// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export interface LoginInput {
  email: string;
  password: string;
}

// Estructura de un Permiso (dentro de un Role)
export interface Permission {
  description?: string;
  id: string;
  name: string;
}

// Estructura de un Rol (dentro de un Usuario)
export interface Role {
  id: string;
  name: string;
  createdAt?: string;
  description?: string;
  permissions?: Permission[];
  updatedAt?: string;
}

// Estructura de un Usuario
export interface User {
  id: string; // Puede ser number o string, ajusta según tu Auth Service
  email: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  role?: Role; // Asumiendo que un usuario tiene un rol
}

// Respuesta esperada del Auth Service (la parte de 'data.loginUser')
export interface LoginUserResponse {
  accessToken: string;
  user: User;
}

// Respuesta completa de GraphQL del Auth Service
export interface AuthLoginServiceResponse {
  data?: {
    loginUser?: {
      accessToken: string;
      refreshToken: string; // <-- Asegúrate de que esta línea esté presente
      user: User;
      // Otros campos que tu microservicio Auth pueda devolver en loginUser
    };
  };
  errors?: any[]; // Errores GraphQL devueltos por el microservicio
}

// Estructura de un ítem de menú de la barra lateral
export interface SidebarMenuItem {
  id: string;
  label: string; // Usas 'label' en tu JSON, no 'name'
  path?: string;
  icon?: string;
  children?: SidebarMenuItem[] | null; // Puede tener hijos o ser null
}

// Respuesta completa de GraphQL del Sidebar Service
export interface SidebarServiceResponse {
  data?: {
    getSidebarMenu: SidebarMenuItem[];
  };
  errors?: any[]; // Array de errores de GraphQL si los hay
}

// Estructura del resultado final que devuelve el LoginOrchestrator al AuthController
export interface LoginOrchestratorResult {
  statusCode: number;
  success: boolean;
  body: {
    accessToken: string | null;
    refreshToken: string | null; // <-- Asegúrate de que esta línea esté presente
    user: User | null;
    sidebarMenu?: SidebarMenuItem[]; // Es opcional porque el sidebar podría fallar
    message?: string;
    errors?: any[];
  };
}
