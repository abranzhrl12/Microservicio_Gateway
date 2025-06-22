// src/users/models/user.model.ts (o donde definas tu User @ObjectType)

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Role } from '../interfaces/role.interface';


@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true }) // Si name es opcional
  name?: string;

  @Field({ nullable: true }) // Si dni es opcional
  dni?: string;

  @Field({ nullable: true }) // Si lastName es opcional
  lastName?: string;

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  avatarPublicId?: string;

  @Field(() => Date)
  createdAt: Date; // Asumiendo que AuthResponse ya transformó las fechas

  @Field(() => Date)
  updatedAt: Date; // Asumiendo que AuthResponse ya transformó las fechas


  @Field(() => Role) // <-- Usa GatewayRole aquí
  role: Role;

  // ...
}