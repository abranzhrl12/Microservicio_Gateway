// // src/config/fastify.config.ts

import Fastify from 'fastify';
import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { Logger } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import websocketPlugin from '@fastify/websocket';

export const configureFastifyPlugins = async (
  app: NestFastifyApplication,
  logger: Logger,
  configService: ConfigService,
) => {
  const fastifyInstance = app.getHttpAdapter().getInstance();

  const frontendUrls = configService.get<string | string[]>('FRONTEND_URLS');
  let allowedOrigins: string[] = [];

  if (frontendUrls) {
    if (Array.isArray(frontendUrls)) {
      allowedOrigins = frontendUrls.map((url) => url.trim());
    } else if (typeof frontendUrls === 'string') {
      allowedOrigins = frontendUrls.split(',').map((url) => url.trim());
    }
  }

  // --- Plugins ---
  // @ts-ignore
  await fastifyInstance.register(websocketPlugin);
  logger.log('Plugin de WebSocket activado con @fastify/websocket.');

  // @ts-ignore
  await fastifyInstance.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  });
  logger.log(`CORS habilitado con @fastify/cors para orígenes: ${allowedOrigins.join(', ')}`);

  // @ts-ignore
  await fastifyInstance.register(fastifyCompress);
  logger.log('Compresión activada con @fastify/compress.');

  // @ts-ignore
  await fastifyInstance.register(fastifyHelmet);
  logger.log('Seguridad HTTP activada con @fastify/helmet.');

  // --- Hooks ---
  fastifyInstance.addHook('onRequest', (request, reply, done) => {
    logger.debug(`[Fastify] Petición entrante: ${request.method} ${request.url}`);
    done();
  });

  // ✅ Mostrar errores de validación GraphQL con detalles
  fastifyInstance.addHook('onError', (request, reply, error, done) => {
    const isGraphqlValidationError = error?.message?.toLowerCase().includes('graphql validation error');
    const detailedErrors = (error as any)?.errors;

    if (isGraphqlValidationError && Array.isArray(detailedErrors)) {
      detailedErrors.forEach((e: any, i: number) => {
        logger.warn(`[GraphQL Validation ${i + 1}] ${e.message}`);
      });
    } else if (isGraphqlValidationError) {
      logger.warn(`[Fastify][onError - GraphQL] ${error.message}`);
    } else {
      logger.error(`[Fastify][onError] ${error.message}`, error.stack);
    }

    done();
  });

  logger.log('Hooks y plugins de Fastify configurados.');
};

export const createFastifyInstance = (logger: Logger) => {
  return Fastify({
    logger: true,
    bodyLimit: 50 * 1024 * 1024, // Límite de 50MB
  });
};
