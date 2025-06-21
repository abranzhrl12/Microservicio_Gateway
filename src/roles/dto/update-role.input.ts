// src/roles/dto/update-role.input.ts (EN TU API GATEWAY)

import { InputType, Field, PartialType } from '@nestjs/graphql'; // <-- ¡VERIFICA ESTAS IMPORTACIONES!
import { CreateRoleInput } from './create-role.input'; // <-- ¡VERIFICA LA RUTA!

@InputType()
export class UpdateRoleInput extends PartialType(CreateRoleInput) {
  // No debe haber nada más aquí si solo quieres que los campos de CreateRoleInput sean opcionales.
  // Por ejemplo, NO debe haber:
  // @Field({ nullable: true }) name?: string;
  // @Field({ nullable: true }) description?: string;
  // PartialType ya se encarga de eso.
}