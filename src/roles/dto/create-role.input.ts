// src/roles/dto/create-role.input.ts (EN TU API GATEWAY)
import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

@InputType()
export class CreateRoleInput {
  @Field() // No nullable por defecto en GraphQL
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Field({ nullable: true }) // Explicitamente nullable en GraphQL
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string; // Opcional en TypeScript
}