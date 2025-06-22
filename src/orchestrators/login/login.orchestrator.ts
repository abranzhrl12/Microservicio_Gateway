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
    // La inyección de NATS_SERVICE ha sido comentada/eliminada
    // @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {
    const authUrl = this.configService.get<string>('AUTH_SERVICE_URL');
    const sidebarUrl = this.configService.get<string>('SIDEBAR_SERVICE_URL');

    if (!authUrl) {
      this.logger.error('AUTH_SERVICE_URL no definido en el Gateway.');
      throw new InternalServerErrorException('AUTH_SERVICE_URL no definido en las variables de entorno.');
    }
    if (!sidebarUrl) {
      this.logger.error('SIDEBAR_SERVICE_URL no definido en el Gateway.');
      throw new InternalServerErrorException('SIDEBAR_SERVICE_URL no definido en las variables de entorno.');
    }

    this.AUTH_SERVICE_URL = authUrl;
    this.SIDEBAR_SERVICE_URL = sidebarUrl;
  }

  async orchestrateLogin(
    loginInputFromFrontend: LoginInput,
    correlationId: string,
  ): Promise<LoginOrchestratorResult> {
    this.logger.log(`[${correlationId}] [Login Orchestrator] Iniciando login orquestado.`);
    this.logger.debug(`[${correlationId}] Recibiendo input de solicitud (limpio): ${JSON.stringify(loginInputFromFrontend)}`);

    const authServiceGraphqlUrl = `${this.AUTH_SERVICE_URL}/auth`;
    const sidebarServiceGraphqlUrl = `${this.SIDEBAR_SERVICE_URL}/sidebar-menu`;

    let accessToken: string | null = null;
    let refreshToken: string | null = null; // <--- **CORREGIDO: Declarado e inicializado aquí**
    let user: User | null = null;
    let sidebarMenu: SidebarMenuItem[] = [];
    let sidebarErrors: any[] = [];
    let loginSuccessful = false; // Bandera para controlar la ejecución de la llamada al sidebar

    try {
      // 1. Llamada al Microservicio de Autenticación
      const authRequestBody = JSON.stringify({
        query: loginQuery,
        variables: { loginInput: loginInputFromFrontend },
      });

      const authController = new AbortController();
      const authTimeoutId = setTimeout(() => authController.abort(), 10000); // 10 segundos de timeout

      this.logger.debug(`[${correlationId}] Realizando fetch a Auth Service: ${authServiceGraphqlUrl}`);
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
        try { errorResponseData = JSON.parse(errorResponseText); } catch (e) { errorResponseData = { message: errorResponseText || loginResponse.statusText || 'Error desconocido' }; }
        this.logger.warn(
          `[${correlationId}] [Login Orchestrator] HTTP Error del Auth Service (${loginResponse.status}): ${JSON.stringify(errorResponseData)}`,
        );
        // NO EMITIR EVENTOS NATS SI SE HAN ELIMINADO LOS NATS CLIENTS
        return {
          statusCode: loginResponse.status,
          success: false,
          body: {
            accessToken: null,
            refreshToken: null, // <--- **CORREGIDO: Se asegura que sea null en caso de error**
            user: null,
            message: errorResponseData.message || 'Error en el servicio de autenticación.',
            errors: errorResponseData.errors || [{ message: 'Respuesta inesperada del servicio de autenticación.' }],
          },
        };
      }

      const loginData: AuthLoginServiceResponse = await loginResponse.json();

      // **CORREGIDO: Ahora se chequea tanto accessToken como refreshToken en la desestructuración**
      if (loginData.errors || !loginData.data?.loginUser?.accessToken || !loginData.data?.loginUser?.refreshToken) {
        this.logger.warn(
          `[${correlationId}] [Login Orchestrator] Falló el login en Auth Service (GraphQL errors o tokens faltantes): ${JSON.stringify(loginData.errors || loginData)}`,
        );
        // NO EMITIR EVENTOS NATS
        return {
          statusCode: loginResponse.status || 401,
          success: false,
          body: {
            accessToken: null,
            refreshToken: null, // <--- **CORREGIDO: Se asegura que sea null en caso de error**
            user: null,
            message: 'Credenciales inválidas o error en el servicio de autenticación.',
            errors: loginData.errors || [{ message: 'Respuesta inesperada del servicio de autenticación.' }],
          },
        };
      }

      // **CORREGIDO: Desestructurar refreshToken directamente de loginData.data.loginUser**
      ({ accessToken, refreshToken, user } = loginData.data.loginUser);
      loginSuccessful = true; // El login fue exitoso, ahora podemos intentar obtener el sidebar
      this.logger.log(
        `[${correlationId}] [Login Orchestrator] Login exitoso para usuario: ${user.email}`,
      );
      // NO EMITIR EVENTOS NATS


      // 2. Llamada al Microservicio de Sidebar/Navegación (Solo si el login fue exitoso y tenemos accessToken)
      if (loginSuccessful && accessToken) { // Solo se ejecuta si el paso 1 fue exitoso
        try {
          const sidebarController = new AbortController();
          const sidebarTimeoutId = setTimeout(() => sidebarController.abort(), 10000);

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
            try { errorResponseData = JSON.parse(errorResponseText); } catch (e) { errorResponseData = { message: errorResponseText || sidebarResponse.statusText || 'Error desconocido' }; }
            this.logger.error(
              `[${correlationId}] [Login Orchestrator] HTTP Error del Sidebar Service (${sidebarResponse.status}): ${JSON.stringify(errorResponseData)}`,
            );
            sidebarErrors.push({
              message: errorResponseData.message || `Error del Sidebar Service (${sidebarResponse.status}).`,
              details: errorResponseData.errors || errorResponseData,
            });
            // NO EMITIR EVENTOS NATS
          } else {
            const sidebarData: SidebarServiceResponse = await sidebarResponse.json();

            if (sidebarData.errors) {
              this.logger.error(
                `[${correlationId}] [Login Orchestrator] Falló al obtener sidebar del Sidebar Service (GraphQL errors): ${JSON.stringify(sidebarData.errors)}`,
              );
              sidebarErrors = sidebarData.errors;
              // NO EMITIR EVENTOS NATS
            } else {
              sidebarMenu = sidebarData.data?.getSidebarMenu || [];
              this.logger.log(
                `[${correlationId}] [Login Orchestrator] Sidebar obtenido para usuario: ${user.email}`,
              );
              // NO EMITIR EVENTOS NATS
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
            // NO EMITIR EVENTOS NATS
          } else {
            this.logger.error(
              `[${correlationId}] [Login Orchestrator] Error de red o inesperado al llamar al Sidebar Service: ${sidebarError.message}`,
              sidebarError.stack,
            );
            sidebarErrors.push({
              message: sidebarError.message || 'Error desconocido al obtener el menú.',
            });
            // NO EMITIR EVENTOS NATS
          }
        }
      }

      // 3. Combinar y devolver la respuesta final al Frontend
      return {
        statusCode: 200,
        success: sidebarErrors.length === 0, // Indicar éxito si no hubo errores en sidebar
        body: {
          accessToken,
          refreshToken, // <--- **CORREGIDO: Incluido en la respuesta final**
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
      // Manejo de errores que ocurrieron antes de la desestructuración de loginData,
      // o errores de timeout generales del Auth Service
      if (error.name === 'AbortError') {
        this.logger.error(
          `[${correlationId}] [Login Orchestrator] Timeout al llamar al Auth Service: ${error.message}`,
        );
        // NO EMITIR EVENTOS NATS
        return {
          statusCode: 504, // Gateway Timeout
          success: false,
          body: {
            accessToken: null,
            refreshToken: null, // <--- **CORREGIDO: Asegurarse de retornar null aquí en caso de error**
            user: null,
            message: 'Timeout al contactar el servicio de autenticación durante el login.',
            errors: [{ message: 'El servicio de autenticación tardó demasiado en responder.' }],
          },
        };
      } else {
        this.logger.error(
          `[${correlationId}] [Login Orchestrator] Error crítico durante login orquestado: ${error.message}`,
          error.stack,
        );
        // NO EMITIR EVENTOS NATS
        return {
          statusCode: 500,
          success: false,
          body: {
            accessToken: null,
            refreshToken: null, // <--- **CORREGIDO: Asegurarse de retornar null aquí en caso de error**
            user: null,
            message: 'Error interno del Gateway al procesar el login.',
            errors: [{ message: error.message || 'Error desconocido en el orquestador de login.' }],
          },
        };
      }
    }
  }
}