// gateway/src/auth/dto/login-input.dto.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class LoginInputDto { // Nombre con 'Dto' para claridad
  @Field()
  email: string;

  @Field()
  password: string;
}