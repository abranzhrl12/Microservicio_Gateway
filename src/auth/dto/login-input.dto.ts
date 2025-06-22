// gateway/src/auth/dto/login-input.dto.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType('LoginInput') 
export class LoginInputDto {
  @Field()
  email: string;
  @Field()
  password: string;
}