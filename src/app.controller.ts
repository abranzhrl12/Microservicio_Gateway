import {
  Controller,
  All,
  Req,
  Res,
  Get,
  Logger,
  InternalServerErrorException,
  Post,
  Body,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { FastifyReply, FastifyRequest } from 'fastify';

import fetch from 'node-fetch';

import { Public } from './common/decorators/public.decorator';

import { loginQuery } from './graphql-queries/auth-login.query';

import { sidebarQuery } from './graphql-queries/sidebar-menu.query'; // Tu query para el menú
// import { AppGateway } from './websocket/app.gateway';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  private AUTH_SERVICE_URL: string;

  private SIDEBAR_SERVICE_URL: string;

  constructor(private readonly configService: ConfigService ) {
    const authUrl = this.configService.get<string>('AUTH_SERVICE_URL');

    if (!authUrl)
      throw new Error('AUTH_SERVICE_URL no definido en el Gateway.');

    this.AUTH_SERVICE_URL = authUrl;

     const sidebarUrl = this.configService.get<string>('SIDEBAR_SERVICE_URL');

     if (!sidebarUrl)
      throw new Error('SIDEBAR_SERVICE_URL no definido en el Gateway.'); // También corregí el mensaje de error para que coincida

    this.SIDEBAR_SERVICE_URL = sidebarUrl;
  }

  @Public()
  @Get('healthz')
  getHealth(): string {
    return 'API Gateway está vivo!';
  }

  @Public()
  @Post('login')
  async orchestrateLogin(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const correlationId = Math.random().toString(36).substring(2, 15);

    this.logger.log(
      `[${correlationId}] [Login Orchestrator] Iniciando login orquestado.`,
    );

    this.logger.debug(
      `[${correlationId}] Recibiendo cuerpo de solicitud: ${JSON.stringify(req.body)}`,
    ); // EXTRACCIÓN CRÍTICA: Obtener loginInput del cuerpo GraphQL del frontend
    // El cuerpo que llega del frontend es: { query: "...", variables: { loginInput: { email: "...", password: "..." } } }

    const loginInputFromFrontend = (req.body as any)?.variables?.loginInput;

    if (!loginInputFromFrontend) {
      this.logger.error(
        `[${correlationId}] [Login Orchestrator] Cuerpo de solicitud de login inválido. Se esperaba '{ variables: { loginInput: { email, password } } }'.`,
      );

      return res
        .status(400)
        .send({
          message:
            'Cuerpo de solicitud de login inválido. Formato esperado de GraphQL.',
        });
    } // 1. Llamar al Microservicio de Autenticación
    // La URL DEBE apuntar al ENDPOINT GRAPHQL de Autenticación.

    const authServiceGraphqlUrl = `${this.AUTH_SERVICE_URL}/auth`; // <-- ¡CORREGIDO! DEBE SER /graphql

    try {
      const loginResponse = await fetch(authServiceGraphqlUrl, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          query: loginQuery, // Esta es la query SIMPLIFICADA para el Auth MS
          // Pasamos las variables como lo espera 'loginQuery'
          // 'loginQuery' (corregida abajo) espera { loginInput: { email, password } }

          variables: { loginInput: loginInputFromFrontend }, // <-- ¡CORREGIDO PARA COINCIDIR CON loginQuery!
        }),
      });

      const loginData: any = await loginResponse.json();

      if (loginData.errors || !loginData.data?.loginUser?.accessToken) {
        this.logger.warn(
          `[${correlationId}] [Login Orchestrator] Falló el login en Auth Service: ${JSON.stringify(loginData.errors || loginData)}`,
        );

        return res.status(loginResponse.status || 401).send(loginData);
      }

      const { accessToken, user } = loginData.data.loginUser;

      this.logger.log(
        `[${correlationId}] [Login Orchestrator] Login exitoso para usuario: ${user.email}`,
      ); // 2. Llamar al Microservicio de Sidebar/Navegación
      // La URL DEBE apuntar al ENDPOINT GRAPHQL de Sidebar.

      const sidebarServiceGraphqlUrl = `${this.SIDEBAR_SERVICE_URL}/sidebar-menu`; // <-- ¡CORREGIDO! DEBE SER /graphql

      let sidebarMenu = [];

      try {
        const sidebarResponse = await fetch(sidebarServiceGraphqlUrl, {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',

            Authorization: `Bearer ${accessToken}`, // Autentica la llamada
          },

          body: JSON.stringify({
            query: sidebarQuery, // La query de sidebar (sin variables, obtiene el usuario del JWT)

            variables: {}, // ¡Correcto, variables vacías!
          }),
        });

        const sidebarData: any = await sidebarResponse.json();

        if (sidebarData.errors) {
          this.logger.error(
            `[${correlationId}] [Login Orchestrator] Falló al obtener sidebar del Sidebar Service: ${JSON.stringify(sidebarData.errors)}`,
          );

          return res.status(sidebarResponse.status || 500).send({
            accessToken: accessToken,

            user: user,

            sidebarMenu: [],

            errors: sidebarData.errors,

            message:
              'Login exitoso, pero no se pudo cargar el menú. Intente de nuevo.',
          });
        }

        sidebarMenu = sidebarData.data?.getSidebarMenu || [];

        this.logger.log(
          `[${correlationId}] [Login Orchestrator] Sidebar obtenido para usuario: ${user.email}`,
        );
      } catch (sidebarError: any) {
        this.logger.error(
          `[${correlationId}] [Login Orchestrator] Error de red o inesperado al llamar al Sidebar Service: ${sidebarError.message}`,
          sidebarError.stack,
        );

        return res.status(200).send({
          accessToken,

          user,

          sidebarMenu: [],

          message:
            'Login exitoso, pero no se pudo cargar el menú debido a un error de comunicación.',

          errors: [
            {
              message:
                sidebarError.message || 'Error desconocido al obtener el menú.',
            },
          ],
        });
      } // 3. Combinar y devolver la respuesta final al Frontend

      return res.status(200).send({
        accessToken,

        user,

        sidebarMenu,
      });
    } catch (error: any) {
      this.logger.error(
        `[${correlationId}] [Login Orchestrator] Error durante login orquestado: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Error interno del Gateway al procesar el login.',
      );
    }
  } // --- Método Auxiliar para el Reenvío de Solicitudes (Lógica Común) ---
  // Este método proxyRequest parece ser para endpoints REST.
  // Tu `orchestrateLogin` está haciendo llamadas GraphQL directas.
  // Revisa si necesitas este `proxyRequest` para algo más.

  private async proxyRequest(
    req: FastifyRequest,

    res: FastifyReply,

    targetUrl: string,

    serviceName: string,
  ) {
    const correlationId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    this.logger.log(
      `[${correlationId}] Proxying request to ${serviceName}: ${req.method} ${targetUrl}`,
    );

    const headers: Record<string, string> = {
      ...(req.headers as Record<string, string>),
    };

    delete headers['host'];

    delete headers['connection'];

    headers['X-Correlation-ID'] = correlationId; // TODO: Si tu `req.user` viene de un JwtAuthGuard en el Gateway,
    // puedes pasar su ID/Email/Role en headers personalizados a los microservicios si los necesitan.
    // Esto es común para la propagación de contexto de usuario.
    // if (req.user) {
    //   headers['X-User-ID'] = req.user.id.toString();
    //   headers['X-User-Email'] = req.user.email;
    //   // headers['X-User-Role'] = req.user.role; // Si role es string
    // }

    this.logger.log(
      `[${correlationId}] [${serviceName} Proxy] Headers enviados: ${JSON.stringify(headers)}`,
    );

    const requestStartTime = Date.now();

    this.logger.log(
      `[${correlationId}] [${serviceName} Proxy] Iniciando petición fetch a las ${new Date(requestStartTime).toISOString()}`,
    );

    try {
      const response = await fetch(targetUrl, {
        method: req.method as any,

        headers: headers,

        body: JSON.stringify(req.body),
      });

      const responseData = await response.json();

      const requestEndTime = Date.now();

      this.logger.log(
        `[${correlationId}] [${serviceName} Proxy] Petición fetch finalizada exitosamente en ${requestEndTime - requestStartTime}ms. Status: ${response.status}`,
      );

      res.status(response.status).send(responseData);
    } catch (error) {
      const requestEndTime = Date.now();

      const duration = requestEndTime - requestStartTime;

      this.logger.error(
        `[${correlationId}] Error proxying to ${serviceName}: ${error.message}. Duración total del intento: ${duration}ms`,
      );

      if (error instanceof Error) {
        this.logger.error(
          `[${correlationId}] Error de red o timeout: ${error.message}`,
        );
      }

      const statusCode = error.response?.status || 500;

      const errorMessage =
        error.response?.data || `Error interno al contactar ${serviceName}`;

      res.status(statusCode).send({ message: errorMessage });
    }
  }

}
