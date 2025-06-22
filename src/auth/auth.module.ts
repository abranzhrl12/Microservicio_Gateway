// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { LoginOrchestrator } from 'src/orchestrators/login/login.orchestrator';
import { AuthResolver } from './auth.resolver';
import { NatsClientModule } from 'src/nats-client/nats-client.module';



@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // No necesitamos 'expiresIn' aquí, ya que solo estamos validando el token que ya existe.
      }),
    }),
    ClientsModule,
    NatsClientModule
    
  ],
  // controllers:[AuthController],
  providers: [JwtStrategy,LoginOrchestrator,AuthResolver],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
