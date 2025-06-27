import { Field, ObjectType } from '@nestjs/graphql';
import { User } from 'src/common/interfaces/users.interface';


import { MenuItem } from 'src/menu-items/interfaces/menu-item.interace';

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;
  @Field({ nullable: true }) // Permite que sea nulo si no siempre lo devuelves (aunque en este caso siempre lo haremos)
  refreshToken?: string; // ¡Campo añadido para el refresh token!

  @Field(() => User)
  user: User; // El usuario ahora incluirá el rol con sus permisos debido a `eager: true`
  @Field(() => [MenuItem], {
    nullable: true,
    description: 'Elementos del menú del sidebar del usuario',
  })
  menuItems?: MenuItem[]; 
   @Field(() => Number, { nullable: true, description: 'Access token expiration time in seconds.' })
  accessTokenExpiresIn?: number;

  @Field(() => Number, { nullable: true, description: 'Refresh token expiration time in seconds.' })
  refreshTokenExpiresIn?: number;
}
