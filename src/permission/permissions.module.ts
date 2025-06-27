import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { NatsClientModule } from "src/nats-client/nats-client.module";
import { PermissionsOrchestrator } from "../orchestrators/permission/permissions.osrchestrator";
import { PermissionsResolver } from "src/permission/PermissionsResolver";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { AuthModule } from "src/auth/auth.module";

@Module({
    imports: [
       PassportModule.register({ defaultStrategy: 'jwt' }),
       NatsClientModule, // <--- ¡Esto es lo que debe ir aquí!
       AuthModule
     ],
     providers: [
         PermissionsOrchestrator,
         PermissionsResolver,
   
       ],
})

export class PermissionsModule{}