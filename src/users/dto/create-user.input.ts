// src/users/dto/create-user.input.ts
import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumberString,
} from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
  email: string;

  @Field()
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @Field({
    nullable: true,
    description: 'Número de Documento Nacional de Identidad (DNI).',
  })
  @IsOptional() // Puede ser opcional en la creación, o IsNotEmpty si es obligatorio
  @IsString({ message: 'El DNI debe ser una cadena de texto.' })
  @IsNumberString({}, { message: 'El DNI debe contener solo números.' }) // Valida que solo sean dígitos
  @MinLength(8, { message: 'El DNI debe tener al menos 8 caracteres.' }) // Ajusta según el formato de DNI de tu país
  dni?: string; // Hazlo opcional si no es obligatorio en la creación

  @Field() // <--- Add this field
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  name: string;

  @Field({ nullable: true }) // <--- Add this field, making it optional
  @IsOptional()
  @IsString({ message: 'El apellido debe ser una cadena de texto.' })
  lastName?: string;

  @Field(() => Int, { description: 'ID del rol asignado al usuario' })
  @IsNotEmpty({ message: 'El rol del usuario es obligatorio.' })
  roleId: number;

  @Field({ defaultValue: true }) // Puedes añadir isActive si tu User entity lo tiene
  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // Asegúrate de que este campo exista en tu User entity y sea opcional

  @Field({ nullable: true })
  @IsOptional()
  avatarUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  avatarPublicId?: string;
}
