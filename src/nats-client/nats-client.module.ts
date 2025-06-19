// src/nats-client/nats-client.module.ts
import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global() // ¡Haz este módulo global!
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NATS_SERVICE', // El nombre para inyectar en otros lugares
        imports: [ConfigModule], // Necesitamos ConfigModule aquí para ConfigService
        useFactory: async (configService: ConfigService) => {
          const natsUrl = configService.get<string>('NATS_URL');
          if (!natsUrl) {
            // Es buena práctica lanzar un error explícito si la variable esencial no está
            throw new Error('NATS_URL environment variable is not defined for NATS client.');
          }
          return {
            transport: Transport.NATS,
            options: {
              servers: [natsUrl],
              // Otras opciones de NATS, como credenciales, etc.
            },
          };
        },
        inject: [ConfigService], // Especifica qué servicios se deben inyectar en useFactory
      },
    ]),
  ],
  exports: [ClientsModule], // Exporta ClientsModule para que 'NATS_SERVICE' sea inyectable
})
export class NatsClientModule {}