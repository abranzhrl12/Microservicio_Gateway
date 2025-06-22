// src/common/interfaces/user.interface.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Role } from './role.interface'; // Asumiendo que has definido Role como un ObjectType en tu Gateway

@ObjectType('User') // Puedes darle un nombre explícito si lo deseas
export class User {
  @Field(() => ID)
  id: number;

  @Field()
  email: string;

  @Field({ nullable: true }) // DNI es nullable en el microservicio
  dni?: string;

  @Field()
  name: string;

  @Field({ nullable: true }) // lastName es nullable en el microservicio
  lastName?: string;
  @Field(() => ID, { nullable: true }) // Añadir esto para exponer roleId
  roleId?: number; // O string, dependiendo de cómo lo tengas en DB

  // La relación es ManyToOne en el microservicio, por lo tanto, es un solo Role, no un array
  @Field(() => Role, { nullable: true }) // nullable porque el eager loading podría fallar o el rol podría no existir en algunos casos
  role?: Role; // Cambiado de `roles: Role[]` a `role: Role`

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  avatarPublicId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
