import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AppController } from './app.controller';
import { JoiValidationSchema } from './config/joi.validation';  // Importa el esquema de validación Joi
import { EnvConfiguration } from './config/env.config';  // Importa la configuración de entorno
import { WebSocketModule } from './websocket/websocket.module';
import { NatsClientModule } from './nats-client/nats-client.module';

@Module({
  imports: [
    // ConfigModule para cargar las variables de entorno y validarlas con Joi
    ConfigModule.forRoot({
      load: [EnvConfiguration],        // Cargar la configuración
      isGlobal: true,                  // Hacerla global para acceder desde cualquier parte de la app
      envFilePath: '.env',             // Especifica la ruta de tu archivo .env
      validationSchema: JoiValidationSchema,  // Aplica la validación Joi
    }),
    NatsClientModule,
    AuthModule,  
    WebSocketModule,
  
  ],
  controllers: [AppController],
  providers: [
    Logger,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,  // Protege las rutas con JWT
    },
  ],
})
export class AppModule {}
