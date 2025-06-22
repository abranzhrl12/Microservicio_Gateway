// src/menu-items/entities/menu-item.entity.ts (en tu Gateway)
// (Asegúrate de que esta ruta sea consistente con tu estructura de módulos)
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';


@ObjectType()
export class MenuItem {
  @Field(() => ID)
  id: string; // IDs de TypeORM suelen ser string (UUID) o number. Ajusta según tu DB.

  @Field(() => String)
  label: string;

  @Field(() => String, { nullable: true })
  path?: string;

  @Field(() => String, { nullable: true })
  icon?: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int, { description: 'Orden de visualización del ítem de menú.' })
  order: number;

  @Field(() => ID, { nullable: true, description: 'ID del ítem de menú padre.' })
  parentId?: string;

  @Field(() => MenuItem, { nullable: true, description: 'El ítem de menú padre.' })
  parent?: MenuItem; // Relación recursiva para el padre

  @Field(() => [MenuItem], { nullable: true, description: 'Hijos del ítem de menú.' })
  children?: MenuItem[]; // Relación recursiva para los hijos

  @Field(() => [String], { nullable: true, description: 'Permisos requeridos para ver el ítem del menú.' })
  requiredPermissions?: string[]; // Array de strings, no de objetos complejos

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}