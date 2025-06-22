// src/common/models/paginated-roles.model.ts (Es una convención usar .model.ts para tipos GraphQL en el Gateway)

import { ObjectType } from '@nestjs/graphql';
import { Role } from '../interfaces/role.interface'; // <-- Asegúrate que esta ruta sea correcta a tu Role @ObjectType()
import { PaginatedResponse } from '../models/paginated-response.model';

@ObjectType({ description: 'Respuesta paginada para la lista de roles.' })
export class PaginatedRoles extends PaginatedResponse(Role) {}