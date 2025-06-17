// src/websocket/websocket.gateway.ts
import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws'; // Importa el tipo WebSocket de la librería 'ws'

// Puedes usar esto como un servicio inyectable si necesitas lógica de negocio
// para tus eventos WebSocket.
@Injectable()
export class WebSocketGateway {
  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedClients: Set<WebSocket> = new Set();

  // Este método podría ser llamado desde websocket.module.ts
  // si necesitas notificar a un "gateway" de NestJS sobre una conexión.
  handleConnection(client: WebSocket) {
    this.connectedClients.add(client);
    this.logger.log(`Nuevo cliente WebSocket conectado. Total: ${this.connectedClients.size}`);
  }

  handleDisconnect(client: WebSocket) {
    this.connectedClients.delete(client);
    this.logger.log(`Cliente WebSocket desconectado. Total: ${this.connectedClients.size}`);
  }

  handleMessage(client: WebSocket, message: string) {
    this.logger.debug(`[WebSocketGateway] Mensaje recibido: ${message}`);
    // Aquí puedes procesar el mensaje, por ejemplo, enviarlo a un servicio
    // this.webSocketService.processMessage(message);

    // Broadcast simple a todos los clientes conectados (excepto el emisor)
    this.connectedClients.forEach(c => {
      if (c !== client && c.readyState === WebSocket.OPEN) {
        c.send(`Broadcast: ${message}`);
      }
    });
  }

  // Ejemplo: método para enviar un mensaje a un cliente específico
  sendMessageToClient(client: WebSocket, data: any) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  // Ejemplo: método para emitir a todos los clientes
  broadcast(data: any) {
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}