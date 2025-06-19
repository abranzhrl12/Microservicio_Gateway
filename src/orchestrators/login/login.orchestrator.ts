// src/orchestrators/login/login.orchestrator.ts
import {
  Injectable,
  InternalServerErrorException, // Aunque ahora devolvemos objetos, aún útil para errores internos del orquestador
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';

// ¡Asegúrate que estas rutas y las interfaces estén bien definidas!
import { loginQuery, sidebarQuery } from '../../graphql-queries'; // Asegúrate que sea un index.ts o directo
import {
  LoginInput,
  AuthLoginServiceResponse,
  SidebarServiceResponse,
  LoginOrchestratorResult,
  User,
  SidebarMenuItem,
} from '../../common/interfaces/loginresponse.interface'; // ¡Nombre del archivo corregido a login-response.interface!


@Injectable()
export class LoginOrchestrator {
  private readonly logger = new Logger(LoginOrchestrator.name);
  private AUTH_SERVICE_URL: string;
  private SIDEBAR_SERVICE_URL: string;

  constructor(
    private configService: ConfigService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy, // <-- ¡Inyecta el cliente NATS aquí!
  ) {
    const authUrl = this.configService.get<string>('AUTH_SERVICE_URL');
    const sidebarUrl = this.configService.get<string>('SIDEBAR_SERVICE_URL');

    if (!authUrl) {
      this.logger.error('AUTH_SERVICE_URL no definido en el Gateway.');
      throw new Error('AUTH_SERVICE_URL no definido en las variables de entorno.');
    }
    if (!sidebarUrl) {
      this.logger.error('SIDEBAR_SERVICE_URL no definido en el Gateway.');
      throw new Error('SIDEBAR_SERVICE_URL no definido en las variables de entorno.');
    }

    this.AUTH_SERVICE_URL = authUrl;
    this.SIDEBAR_SERVICE_URL = sidebarUrl;
  }

  async orchestrateLogin(
    loginInputFromFrontend: LoginInput,
    correlationId: string,
  ): Promise<LoginOrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Login Orchestrator] Iniciando login orquestado.`,
    );
    this.logger.debug(
      `[${correlationId}] Recibiendo input de solicitud (limpio): ${JSON.stringify(loginInputFromFrontend)}`,
    );

    // 1. Llamar al Microservicio de Autenticación
    // ¡CRÍTICO! Asume que el endpoint GraphQL de tu Auth Service es /graphql
    const authServiceGraphqlUrl = `${this.AUTH_SERVICE_URL}/auth`;

    try {
      const authController = new AbortController();
      const authTimeoutId = setTimeout(() => authController.abort(), 10000); // 10 segundos de timeout

      this.logger.debug(`[${correlationId}] Realizando fetch a Auth Service: ${authServiceGraphqlUrl}`);
      const authRequestBody = JSON.stringify({
        query: loginQuery,
        variables: { loginInput: loginInputFromFrontend },
      });
      this.logger.debug(`[${correlationId}] Fetch Body enviado al Auth Service: ${authRequestBody}`);

      const loginResponse = await fetch(authServiceGraphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: authRequestBody,
        signal: authController.signal,
      });

      clearTimeout(authTimeoutId); // Limpia el timeout si la respuesta llega a tiempo

      if (!loginResponse.ok) { // Si la respuesta HTTP no es 2xx
        const errorResponseText = await loginResponse.text();
        let errorResponseData;
        try {
          errorResponseData = JSON.parse(errorResponseText);
        } catch (e) {
          errorResponseData = { message: errorResponseText || loginResponse.statusText || 'Error desconocido' };
        }
        this.logger.warn(
          `[${correlationId}] [Login Orchestrator] HTTP Error del Auth Service (${loginResponse.status}): ${JSON.stringify(errorResponseData)}`,
        );
        this.natsClient.emit('auth.login.failed', {
            correlationId,
            email: loginInputFromFrontend.email,
            statusCode: loginResponse.status,
            errors: errorResponseData.errors || [{ message: errorResponseData.message }],
            timestamp: new Date()
        });
        return {
          statusCode: loginResponse.status,
          body: {
            message: errorResponseData.message || 'Error en el servicio de autenticación.',
            errors: errorResponseData.errors || [{ message: 'Respuesta inesperada del servicio de autenticación.' }],
          },
          success: false,
        };
      }

      const loginData: AuthLoginServiceResponse = await loginResponse.json();

      if (loginData.errors || !loginData.data?.loginUser?.accessToken) {
        this.logger.warn(
          `[${correlationId}] [Login Orchestrator] Falló el login en Auth Service (GraphQL errors): ${JSON.stringify(loginData.errors || loginData)}`,
        );
        this.natsClient.emit('auth.login.failed', {
            correlationId,
            email: loginInputFromFrontend.email,
            statusCode: loginResponse.status || 401, // Usa el status de la respuesta si es relevante, sino un 401
            errors: loginData.errors,
            timestamp: new Date()
        });
        return {
          statusCode: loginResponse.status || 401,
          body: {
            message: 'Credenciales inválidas o error en el servicio de autenticación.',
            errors: loginData.errors || [{ message: 'Respuesta inesperada del servicio de autenticación.' }],
          },
          success: false,
        };
      }

      const { accessToken, user }: { accessToken: string; user: User } = loginData.data.loginUser;
      this.logger.log(
        `[${correlationId}] [Login Orchestrator] Login exitoso para usuario: ${user.email}`,
      );
      this.natsClient.emit('auth.user.loggedIn', {
          correlationId,
          userId: user.id,
          email: user.email,
          role: user.role?.name, // Acceso seguro a role.name
          timestamp: new Date()
      });


      // 2. Llamar al Microservicio de Sidebar/Navegación
      // ¡CRÍTICO! Asume que el endpoint GraphQL de tu Sidebar Service es /graphql
      const sidebarServiceGraphqlUrl = `${this.SIDEBAR_SERVICE_URL}/sidebar-menu`;

      let sidebarMenu: SidebarMenuItem[] = [];
      let sidebarErrors: any[] = [];

      try {
        const sidebarController = new AbortController();
        const sidebarTimeoutId = setTimeout(() => sidebarController.abort(), 10000); // 10 segundos de timeout

        this.logger.debug(`[${correlationId}] Realizando fetch a Sidebar Service: ${sidebarServiceGraphqlUrl}`);
        const sidebarRequestBody = JSON.stringify({
          query: sidebarQuery,
          variables: {},
        });
        this.logger.debug(`[${correlationId}] Fetch Body enviado al Sidebar Service: ${sidebarRequestBody}`);

        const sidebarResponse = await fetch(sidebarServiceGraphqlUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`, // Autentica la llamada al Sidebar
          },
          body: sidebarRequestBody,
          signal: sidebarController.signal,
        });

        clearTimeout(sidebarTimeoutId);

        if (!sidebarResponse.ok) {
          const errorResponseText = await sidebarResponse.text();
          let errorResponseData;
          try {
            errorResponseData = JSON.parse(errorResponseText);
          } catch (e) {
            errorResponseData = { message: errorResponseText || sidebarResponse.statusText || 'Error desconocido' };
          }
          this.logger.error(
            `[${correlationId}] [Login Orchestrator] HTTP Error del Sidebar Service (${sidebarResponse.status}): ${JSON.stringify(errorResponseData)}`,
          );
          sidebarErrors.push({
            message: errorResponseData.message || `Error del Sidebar Service (${sidebarResponse.status}).`,
            details: errorResponseData.errors || errorResponseData,
          });
          this.natsClient.emit('sidebar.load.failed', {
              correlationId,
              userId: user.id,
              statusCode: sidebarResponse.status,
              errors: errorResponseData.errors,
              timestamp: new Date()
          });
        } else {
          const sidebarData: SidebarServiceResponse = await sidebarResponse.json();

          if (sidebarData.errors) {
            this.logger.error(
              `[${correlationId}] [Login Orchestrator] Falló al obtener sidebar del Sidebar Service (GraphQL errors): ${JSON.stringify(sidebarData.errors)}`,
            );
            sidebarErrors = sidebarData.errors;
            this.natsClient.emit('sidebar.load.failed', {
                correlationId,
                userId: user.id,
                errors: sidebarData.errors,
                timestamp: new Date()
            });
          } else {
            sidebarMenu = sidebarData.data?.getSidebarMenu || [];
            this.logger.log(
              `[${correlationId}] [Login Orchestrator] Sidebar obtenido para usuario: ${user.email}`,
            );
            this.natsClient.emit('sidebar.loaded', {
                correlationId,
                userId: user.id,
                menuItemsCount: sidebarMenu.length,
                timestamp: new Date()
            });
          }
        }
      } catch (sidebarError: any) {
        if (sidebarError.name === 'AbortError') {
            this.logger.error(
              `[${correlationId}] [Login Orchestrator] Timeout al llamar al Sidebar Service: ${sidebarError.message}`,
            );
            sidebarErrors.push({
                message: 'Timeout al intentar obtener el menú del Sidebar Service.',
            });
            this.natsClient.emit('sidebar.communication.timeout', {
                correlationId,
                userId: user.id,
                errorMessage: sidebarError.message,
                timestamp: new Date()
            });
        } else {
            this.logger.error(
              `[${correlationId}] [Login Orchestrator] Error de red o inesperado al llamar al Sidebar Service: ${sidebarError.message}`,
              sidebarError.stack,
            );
            sidebarErrors.push({
                message: sidebarError.message || 'Error desconocido al obtener el menú.',
            });
            this.natsClient.emit('sidebar.communication.error', {
                correlationId,
                userId: user.id,
                errorMessage: sidebarError.message,
                stack: sidebarError.stack,
                timestamp: new Date()
            });
        }
      }

      // 3. Combinar y devolver la respuesta final al Frontend
      return {
        statusCode: 200,
        success: sidebarErrors.length === 0, // Indicar éxito si no hubo errores en sidebar
        body: {
          accessToken,
          user,
          sidebarMenu,
          // Solo incluye 'errors' y 'message' si hay errores en el sidebar
          ...(sidebarErrors.length > 0 && {
            errors: sidebarErrors,
            message: 'Login exitoso, pero no se pudo cargar el menú completamente. Intente de nuevo más tarde.',
          }),
        },
      };

    } catch (error: any) {
      if (error.name === 'AbortError') {
          this.logger.error(
              `[${correlationId}] [Login Orchestrator] Timeout al llamar al Auth Service: ${error.message}`,
          );
          this.natsClient.emit('auth.communication.timeout', {
              correlationId,
              errorMessage: error.message,
              timestamp: new Date()
          });
          return {
            statusCode: 504, // Gateway Timeout
            success: false,
            body: {
              message: 'Timeout al contactar el servicio de autenticación durante el login.',
              errors: [{ message: 'El servicio de autenticación tardó demasiado en responder.' }],
            },
          };
      } else {
          this.logger.error(
              `[${correlationId}] [Login Orchestrator] Error crítico durante login orquestado: ${error.message}`,
              error.stack,
          );
          this.natsClient.emit('gateway.orchestration.critical.error', {
              correlationId,
              errorMessage: error.message,
              stack: error.stack,
              timestamp: new Date()
          });
          return {
            statusCode: 500,
            success: false,
            body: {
              message: 'Error interno del Gateway al procesar el login.',
              errors: [{ message: error.message || 'Error desconocido en el orquestador de login.' }],
            },
          };
      }
    }
  }
}