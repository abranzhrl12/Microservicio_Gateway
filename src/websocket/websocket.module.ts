// src/websocket/websocket.module.ts
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { FastifyInstance } from 'fastify';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocket } from 'ws'; // Importa el tipo WebSocket de la librería 'ws'

@Module({
  providers: [WebSocketGateway],
})
export class WebSocketModule implements OnModuleInit {
  private readonly logger = new Logger(WebSocketModule.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  async onModuleInit() {
    const fastifyInstance: FastifyInstance = this.httpAdapterHost.httpAdapter.getInstance();

    fastifyInstance.get('/ws', { websocket: true }, (connection, req) => {
      this.logger.debug(`[WebSocket] Entrando al handler /ws.`);
      this.logger.debug(`[WebSocket] Tipo de 'connection': ${typeof connection}`);
      this.logger.debug(`[WebSocket] 'connection' keys: ${Object.keys(connection).join(', ')}`);
      this.logger.debug(`[WebSocket] 'connection.socket' existe: ${!!connection.socket}`);
      this.logger.debug(`[WebSocket] 'connection.socket' es de tipo: ${typeof connection.socket}`);
      this.logger.debug(`[WebSocket] 'connection._socket' existe: ${!!(connection as any)._socket}`); // DEBUG _socket
      this.logger.debug(`[WebSocket] 'connection._socket' es de tipo: ${typeof (connection as any)._socket}`); // DEBUG _socket

      // *** ¡CAMBIO CRÍTICO AQUÍ! ***
      // La propiedad correcta es `_socket` en lugar de `socket` para la instancia de `WebSocket`.
      const clientSocket: WebSocket = (connection as any)._socket; // Usamos (connection as any) para evitar errores de TypeScript.
                                                                 // Alternativamente, puedes importar `SocketStream` de `@fastify/websocket`
                                                                 // y ver sus tipos exactos.

      if (!clientSocket) {
        this.logger.error(
          `[WebSocket] ERROR: La instancia de clientSocket es 'undefined' para la solicitud de ${req.ip}. ` +
          `Esto suele indicar un problema con el registro del plugin @fastify/websocket o un fallo en el protocolo de actualización.`
        );
        return;
      }

      this.logger.log(`[WebSocket] Nuevo cliente conectado a /ws desde ${req.ip}`);

      clientSocket.on('message', (message: Buffer) => {
        const msg = message.toString();
        this.logger.debug(`[WebSocket] Mensaje recibido de cliente: ${msg}`);
        clientSocket.send(`Eco del Gateway: ${msg}`);
      });

      clientSocket.on('close', (code: number, reason: Buffer) => {
        this.logger.log(`[WebSocket] Cliente desconectado de /ws. Código: ${code}, Razón: ${reason.toString()}`);
      });

      clientSocket.on('error', (error: Error) => {
        this.logger.error(`[WebSocket] Error en conexión WS de /ws: ${error.message}`, error.stack);
      });
    });

    this.logger.log('[WebSocket] Endpoint /ws configurado y escuchando.');
  }
}