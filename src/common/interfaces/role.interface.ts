import { Field, GraphQLISODateTime, ID, InputType, ObjectType } from '@nestjs/graphql';

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
  updatedAt: Date;
}

@InputType() // También debe ser una clase
export class CreateRoleInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;
}

@InputType() // Y esta también
export class UpdateRoleInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;
}