import { InputType, Field, ID, Int } from '@nestjs/graphql'; // Importar Int para roleId
import { IsUUID, IsInt, IsNotEmpty } from 'class-validator';

@InputType()
export class AssignPermissionsToRoleInput {
  @Field(() => Int) // roleId es un number
  @IsInt({ message: 'El ID del rol debe ser un número entero.' })
  @IsNotEmpty({ message: 'El ID del rol es obligatorio.' })
  roleId: number;

  @Field(() => [ID]) // permissionIds son UUIDs (strings)
  @IsUUID('4', { each: true, message: 'Cada ID de permiso debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'La lista de IDs de permisos no puede estar vacía.' })
  permissionIds: string[];
}
