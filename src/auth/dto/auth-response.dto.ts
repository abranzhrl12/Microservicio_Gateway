// gateway/src/auth/dto/auth-response.dto.ts
import { ObjectType, Field } from '@nestjs/graphql';
import { UserDto } from './user.dto';

@ObjectType()
export class AuthResponseDto {
  @Field({ nullable: true }) accessToken?: string; // Hazlo opcional y nullable
  @Field({ nullable: true }) refreshToken?: string;
  @Field(() => UserDto, { nullable: true }) user?: UserDto;
  @Field(() => [String], { nullable: true }) errors?: string[];
  @Field({ nullable: true }) message?: string;
}