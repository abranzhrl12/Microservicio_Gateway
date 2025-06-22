// src/menu-items/dto/update-menu-item.input.ts
import { InputType, Field, PartialType, ID } from '@nestjs/graphql';
import { CreateMenuItemInput } from './create-menu-item.input';
import { IsUUID } from 'class-validator';

@InputType()
export class UpdateMenuItemInput extends PartialType(CreateMenuItemInput) {
  @Field(() => ID)
  @IsUUID('4')
  id: string; // El ID del ítem a actualizar
}
