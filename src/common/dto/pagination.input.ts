// src/common/dto/pagination.input.ts

import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsInt, Min } from 'class-validator';

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1, description: 'Número de página deseada (por defecto: 1).' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10, description: 'Cantidad de elementos por página (por defecto: 10).' })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}