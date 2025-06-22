import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

@InputType()
export class CreatePermissionInput {
  @Field()
  @IsString({ message: 'El nombre del permiso debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre del permiso no puede estar vacío.' })
  @MinLength(3, { message: 'El nombre del permiso debe tener al menos 3 caracteres.' })
  name: string;

  @Field({ nullable: true })
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @IsOptional()
  description?: string;
}
