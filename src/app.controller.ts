// src/app.controller.ts
import { Controller, Get, Logger } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator'; // Asegúrate que esta ruta sea correcta

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  // No necesitamos ConfigService ni NATS aquí a menos que quieras emitir un evento en healthz
  constructor() {}

  @Public() // Marca esta ruta como pública, no requiere autenticación JWT
  @Get('healthz')
  getHealth(): string {
    this.logger.log('API Gateway health check requested.');
    return 'API Gateway está vivo!';
  }
}