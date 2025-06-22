import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Role } from "./role.interface";

@ObjectType()
export class Permission {
  @Field(() => ID)
  id: string;


  @Field()
  name: string; 

  @Field({ nullable: true })
  description?: string;

 @Field(() => [Role], { nullable: true }) 
  roles: Role[];
}