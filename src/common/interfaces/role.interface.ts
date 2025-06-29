import {
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  ObjectType,
} from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { Permission } from './permissions.interface';

@ObjectType() // ¡Debe ser una clase y tener este decorador!
export class Role {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => GraphQLISODateTime, { nullable: true }) // <-- ¡Esto es crucial!
  createdAt: Date;

  // Usa GraphQLISODateTime aquí
  @Field(() => GraphQLISODateTime, { nullable: true }) // <-- ¡Esto es crucial!
  updatedAt: Date; // ¡Añade este campo aquí!
  @IsOptional()
  @Field(() => [Permission], {
    nullable: true,
    description: 'Permisos asociados a este rol.',
  })
  permissions?: Permission[];
}
