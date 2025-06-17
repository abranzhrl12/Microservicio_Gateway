// C:\Proyectos bakend\microservicios\gateway\src\main.ts

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { configureFastifyPlugins, createFastifyInstance } from './config/fastify.config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const fastifyInstance = createFastifyInstance(logger);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    //@ts-ignore
    new FastifyAdapter(fastifyInstance),
    {
      bufferLogs: true,
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    },
  );

  app.useLogger(logger);

  const configService = app.get(ConfigService);

  await configureFastifyPlugins(app, logger, configService); // Llama a la función importada correctamente

  const port = configService.get<number>('GATEWAY_PORT') || 4000;
  logger.log(`[DEBUG MAIN] GATEWAY_PORT leído: ${port}`);

  const authServiceUrlFromEnv = configService.get<string>('AUTH_SERVICE_URL');
  logger.log(`[DEBUG MAIN] AUTH_SERVICE_URL leído: ${authServiceUrlFromEnv}`);

  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway corriendo en http://localhost:${port}`);
}

bootstrap();