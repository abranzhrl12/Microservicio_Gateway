// src/users/dto/update-user.input.ts
import { InputType, Field, PartialType, Int } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input';
import { IsOptional, IsBoolean, IsString, IsEmail, MinLength, MaxLength, IsNumber, IsNumberString } from 'class-validator';
import { GraphQLUpload, FileUpload } from 'graphql-upload-minimal'; // ¡Importa esto!

// PartialType hace que todas las propiedades de CreateUserInput sean opcionales.
@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {

  @Field(() => GraphQLUpload, { nullable: true, description: 'Archivo de avatar a subir. Si se proporciona, se ignorará avatarUrl y avatarPublicId directos.' })
  @IsOptional()
  avatarFile?: FileUpload; // <-- ¡Este es el nuevo campo!

  @Field(() => String, { nullable: true, description: 'URL de la nueva imagen de perfil del usuario.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatarUrl?: string;

  @Field(() => String, { nullable: true, description: 'ID público de la nueva imagen de perfil en Cloudinary/BunnyCDN.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  avatarPublicId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  @MaxLength(255)
  password?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  
  @Field(() => Int, { nullable: true, description: 'Nuevo ID del rol para el usuario.' })
  @IsOptional()
  @IsNumber({}, { message: 'El ID del rol debe ser un número entero.' })
  roleId?: number;

  @Field({ nullable: true, description: 'Número de Documento Nacional de Identidad (DNI).' })
  @IsOptional()
  @IsString({ message: 'El DNI debe ser una cadena de texto.' })
  @IsNumberString({}, { message: 'El DNI debe contener solo números.' })
  @MinLength(8, { message: 'El DNI debe tener al menos 8 caracteres.' })
  dni?: string;

}