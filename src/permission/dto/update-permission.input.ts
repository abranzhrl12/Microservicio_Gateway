import { InputType, Field, PartialType, ID } from '@nestjs/graphql'; // <-- ¡Añadir ID aquí!
import { CreatePermissionInput } from './create-permission.input';
import { IsString, IsUUID, IsOptional } from 'class-validator';

@InputType()
export class UpdatePermissionInput extends PartialType(CreatePermissionInput) {
  @Field(() => ID, { nullable: true }) // El ID del permiso es un UUID (string)
  @IsUUID('4', { message: 'El ID del permiso debe ser un UUID válido.' })
  @IsOptional()
  id?: string;
}
