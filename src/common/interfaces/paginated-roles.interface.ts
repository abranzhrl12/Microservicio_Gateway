// src/common/interfaces/paginated-roles.interface.ts

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Role } from './role.interface'; // Asegúrate de que la ruta a tu Role sea correcta

@ObjectType()
export class PaginatedRoles {
  @Field(() => [Role], { description: 'Lista de roles en la página actual.' })
  items: Role[];

  @Field(() => Int, { description: 'Número total de elementos disponibles en todas las páginas.' })
  totalItems: number;

  @Field(() => Int, { description: 'Número total de páginas disponibles.' })
  totalPages: number;

  @Field(() => Int, { description: 'El número de la página actual.' })
  currentPage: number;

  @Field(() => Int, { description: 'La cantidad de elementos por página.' })
  itemsPerPage: number;
}