// src/roles/roles.module.ts (CORRECCIÓN PROPUESTA)

import { Module } from '@nestjs/common';
import { RoleOrchestrator } from 'src/orchestrators/role/role.orchestrator';
import { RolesResolver } from './roles.resolver';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PassportModule } from '@nestjs/passport'; 
import { NatsClientModule } from 'src/nats-client/nats-client.module'; // <--- ¡CAMBIO CRUCIAL AQUÍ!
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    NatsClientModule, // <--- ¡Esto es lo que debe ir aquí!
    AuthModule
  ],
  controllers: [],
  providers: [
    RoleOrchestrator,
    RolesResolver,
  ],
})
export class RolesModule {}