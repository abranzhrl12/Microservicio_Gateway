// gateway/src/auth/dto/user.dto.ts
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PermissionDto { // Usa Dto para ser consistente
  @Field() id: string;
  @Field() name: string;
  @Field() description: string;
}

// gateway/src/auth/dto/user.dto.ts
@ObjectType()
class RoleDto {
  @Field() id: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string; // <-- Y aquí también opcional
  @Field(() => [PermissionDto], { nullable: true }) permissions?: PermissionDto[];
  @Field() createdAt: Date; // O GraphQLISODateTime si usas scalar Date
  @Field() updatedAt: Date; // O GraphQLISODateTime
}

@ObjectType()
export class UserDto { // Usa Dto para ser consistente
  @Field() id: string;
  @Field() email: string;
  @Field({ nullable: true }) name?: string;
  @Field({ nullable: true }) lastName?: string;
  @Field() isActive: boolean;
  @Field({ nullable: true }) avatarUrl?: string;
  @Field({ nullable: true }) avatarPublicId?: string;
  @Field() createdAt: Date;
  @Field() updatedAt: Date;
  @Field(() => RoleDto, { nullable: true }) role?: RoleDto;
}