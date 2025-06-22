// src/common/models/paginated-users.model.ts
import { ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './paginated-response.model'; // <-- Importa tu función genérica
import { User } from '../interfaces/users.interface';


// Usa la función genérica para crear el tipo paginado para User
@ObjectType()
export class PaginatedUsers extends PaginatedResponse(User) {}