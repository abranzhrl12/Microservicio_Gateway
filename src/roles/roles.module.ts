// src/roles/roles.module.ts (EN TU API GATEWAY - MODIFICADO)

import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller'; // Asegúrate de que la ruta es correcta
import { RoleOrchestrator } from 'src/orchestrators/role/role.orchestrator'; // Asegúrate de que la ruta es correcta
import { ClientsModule } from '@nestjs/microservices'; // <--- ¡Importa ClientsModule aquí!
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'; // Importa si lo usas en el RolesController o providers
import { PassportModule } from '@nestjs/passport'; // Posiblemente necesario para JwtAuthGuard

@Module({
  imports: [
    // Importa PassportModule para que JwtAuthGuard funcione correctamente
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ClientsModule, 

  ],
  controllers: [RolesController],
  providers: [
    RoleOrchestrator,
    JwtAuthGuard 
  ],
})
export class RolesModule {}