import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { NatsClientModule } from 'src/nats-client/nats-client.module';
import { UsersOrchestrator } from 'src/orchestrators/users/users.orchestrator';
import { UsersResolver } from './users.resolver';
import { FilesModule } from 'src/files/files.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    NatsClientModule, 
    FilesModule,
    AuthModule
  ],
  providers: [
    UsersOrchestrator,
    UsersResolver
  ],
})
export class UsersModule {}
