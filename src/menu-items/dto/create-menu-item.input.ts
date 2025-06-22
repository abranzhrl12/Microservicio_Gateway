// src/menu-items/dto/create-menu-item.input.ts
import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsNumber, IsArray } from 'class-validator';

@InputType()
export class CreateMenuItemInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  label: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  path: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  icon?: string;

  @Field({ defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredPermissions?: string[];

  @Field({ defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID('4')
  parentId?: string;
}
