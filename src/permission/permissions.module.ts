import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { NatsClientModule } from "src/nats-client/nats-client.module";
import { PermissionsOrchestrator } from "../orchestrators/permission/permissions.osrchestrator";
import { PermissionsResolver } from "src/permission/PermissionsResolver";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";

@Module({
    imports: [
       PassportModule.register({ defaultStrategy: 'jwt' }),
       NatsClientModule, // <--- ¡Esto es lo que debe ir aquí!
     ],
     providers: [
         PermissionsOrchestrator,
         PermissionsResolver,
   
       ],
})

export class PermissionsModule{}