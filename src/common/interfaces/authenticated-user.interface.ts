// src/common/interfaces/authenticated-user.interface.ts

export interface UserRole {
  id: number;
  name: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole; // <-- This MUST be UserRole (object), not string
  permissions: string[];
  token: string;
}