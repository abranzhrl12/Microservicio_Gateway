// src/auth/auth.controller.ts
import { Controller, Post, Body, Req, Res, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from 'src/common/decorators/public.decorator'; // Asegúrate que esta ruta sea correcta
import { LoginOrchestrator } from '../orchestrators/login/login.orchestrator'; // Importa el orquestador

// Puedes definir una interfaz para el cuerpo GraphQL entrante para mayor tipado
// Es crucial que esta interfaz refleje *exactamente* lo que tu frontend envía para el login
interface GraphqlLoginBody {
  query: string;
  variables: {
    loginInput: {
      email: string;
      password: string;
    };
  };
}

@Controller('auth') // Ruta base para este controlador: /auth
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly loginOrchestrator: LoginOrchestrator) {}

  @Public() // Marca esta ruta como pública
  @Post('login') // Ruta completa: POST /auth/login
  async login(@Body() rawBody: GraphqlLoginBody, @Req() req: FastifyRequest, @Res() res: FastifyReply) {
    // Usamos (req as any).id de Fastify si está disponible, o generamos uno
    const correlationId = (req as any).id || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    this.logger.log(`[${correlationId}] Recibida solicitud de login en /auth/login.`);
    this.logger.debug(`[${correlationId}] Cuerpo raw de solicitud: ${JSON.stringify(rawBody)}`);

    // Extraemos el loginInput real del objeto de variables GraphQL
    const loginInput = rawBody?.variables?.loginInput;

    if (!loginInput || !loginInput.email || !loginInput.password) {
      this.logger.error(`[${correlationId}] Payload de login inválido. Faltan credenciales o formato incorrecto.`);
      return res.status(400).send({
        message: 'Cuerpo de solicitud de login inválido. Se esperaba { variables: { loginInput: { email, password } } }.',
        errors: [{ message: 'Formato GraphQL esperado: { query: "...", variables: { loginInput: { email, password } } }' }],
      });
    }

    try {
      // Delegamos la lógica de orquestación al LoginOrchestrator
      const orchestratorResult = await this.loginOrchestrator.orchestrateLogin(
        loginInput,
        correlationId,
      );

      // El orquestador ya devuelve el statusCode y el body adecuado para la respuesta HTTP
      return res.status(orchestratorResult.statusCode).send(orchestratorResult.body);

    } catch (error: any) {
      this.logger.error(`[${correlationId}] Error inesperado en el controlador de login: ${error.message}`, error.stack);
      // Este catch maneja errores que no fueron capturados por el orquestador
      return res.status(error.status || 500).send({
        message: error.message || 'Error interno del Gateway al procesar la solicitud de login.',
        errors: error.errors || [{ message: 'Error desconocido en el controlador.' }],
      });
    }
  }
}