// src/common/models/paginated-permissions.model.ts (En tu Gateway)

import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from './paginated-response.model'; // <-- Ruta a tu generic
import { Permission } from '../interfaces/permissions.interface';

@ObjectType()
export class PaginatedPermissions extends PaginatedResponse(Permission) {}