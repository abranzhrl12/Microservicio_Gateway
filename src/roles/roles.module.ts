// src/roles/roles.module.ts (CORRECCIÓN PROPUESTA)

import { Module } from '@nestjs/common';
import { RoleOrchestrator } from 'src/orchestrators/role/role.orchestrator';
import { RolesResolver } from './roles.resolver';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PassportModule } from '@nestjs/passport'; // Necesario si usas Passport

// ¡IMPORTA EL MÓDULO QUE YA TIENE LA CONFIGURACIÓN DE NATS!
// Asumo que es 'NatsClientModule' basado en conversaciones anteriores.
import { NatsClientModule } from 'src/nats-client/nats-client.module'; // <--- ¡CAMBIO CRUCIAL AQUÍ!

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    NatsClientModule, // <--- ¡Esto es lo que debe ir aquí!
  ],
  controllers: [],
  providers: [
    RoleOrchestrator,
    RolesResolver,
    JwtAuthGuard // Si JwtAuthGuard ya es global con APP_GUARD en AppModule, puedes considerar quitarlo de aquí.
  ],
})
export class RolesModule {}