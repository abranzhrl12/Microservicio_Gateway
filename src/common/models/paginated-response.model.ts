// src/common/models/paginated-response.model.ts
import { Field, Int, ObjectType } from '@nestjs/graphql';

// Generics para reutilizar esto con cualquier tipo de entidad
export function PaginatedResponse<T>(classRef: T): any {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    // Corrección aquí: indica que classRef es una función constructora para el tipo Field
    @Field(() => [classRef as Function], { nullable: true })
    items: T[];

    @Field(() => Int)
    totalItems: number;

    @Field(() => Int)
    totalPages: number;

    @Field(() => Int)
    currentPage: number;

    @Field(() => Int)
    itemsPerPage: number;
  }
  return PaginatedType;
}