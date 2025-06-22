// src/users/dto/users-pagination.input.ts (o similar)
import { InputType, Field, Int } from '@nestjs/graphql';
import { PaginationInput } from 'src/common/dto/pagination.input'; // Extiende el base
import { IsOptional } from 'class-validator';

@InputType()
export class UsersPaginationInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  nameFilter?: string;

  @Field({ nullable: true })
  @IsOptional()
  emailFilter?: string;

  @Field({ nullable: true })
  @IsOptional()
  dniFilter?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  roleIdFilter?: number;
}