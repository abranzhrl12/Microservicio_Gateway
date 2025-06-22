// src/users/dto/update-user-status.input.ts
import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsNotEmpty } from 'class-validator';

@InputType()
export class UpdateUserStatusInput {
  @Field()
  @IsBoolean({ message: 'isActive debe ser un valor booleano.' })
  @IsNotEmpty({ message: 'isActive no puede estar vacío.' })
  isActive: boolean;
}
