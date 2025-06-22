import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { NatsClientModule } from 'src/nats-client/nats-client.module';
import { MenuItemsResolver } from './menu-items.resolver';
import { MenuItemsOrchestrator } from 'src/orchestrators/menu-items/menu-items.orchestrator';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    NatsClientModule, // <--- ¡Esto es lo que debe ir aquí!
  ],
  providers: [
    MenuItemsOrchestrator,
    MenuItemsResolver
  ],
  exports: [],
})
export class MenuItemsModule {}
