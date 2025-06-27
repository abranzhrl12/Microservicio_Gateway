// src/orchestrators/login/login.orchestrator.ts (en el GATEWAY)

import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { LoginInputDto } from 'src/auth/dto/login-input.dto';
import { AuthResponse } from 'src/auth/models/auth-response.model'; // Asegúrate que AuthResponse en Gateway tiene accessTokenExpiresIn, refreshTokenExpiresIn

import {
  OrchestratorError,
  OrchestratorResult,
} from 'src/common/interfaces/orchestrator-result.interface';
import { User } from 'src/common/interfaces/users.interface'; // Tipado más específico para el usuario
import { deepTransformDates } from 'src/common/utils/date.utils';
import { MenuItem } from 'src/menu-items/interfaces/menu-item.interace';

@Injectable()
export class LoginOrchestrator {
  private readonly logger = new Logger(LoginOrchestrator.name);
  // Asegúrate de que 'NATS_SERVICE' es el ClientProxy que puede comunicarse
  // tanto con el microservicio de Auth como con el de Sidebar (si es el mismo NATS server).
  constructor(@Inject('NATS_SERVICE') private authServiceClient: ClientProxy) {}

  async orchestrateLogin(
    loginInput: LoginInputDto,
    correlationId: string,
  ): Promise<OrchestratorResult<AuthResponse>> {
    this.logger.log(
      `[${correlationId}] [LoginOrchestrator] Iniciando orquestación de login.`,
    );

    let accessToken: string;
    let refreshToken: string;
    let user: User; // Cambiado de 'any' a 'User'
    let menuItems: MenuItem[] | undefined;
    let accessTokenExpiresIn: number | undefined; // Añadido
    let refreshTokenExpiresIn: number | undefined; // Añadido

    try {
      // 1. LLAMADA AL MICROSERVICIO DE AUTENTICACIÓN (Auth Service)
      this.logger.debug(
        `[${correlationId}] Enviando 'login_request' a Auth Service.`,
      );
      const authResult = await firstValueFrom(
        this.authServiceClient
          .send({ cmd: 'login_request' }, { correlationId, loginInput })
          .pipe(
            timeout(10000), // Timeout para esta llamada
          ),
      );
      this.logger.debug(
        `[${correlationId}] RAW_MICROSERVICE_RESPONSE from Auth Service: ${JSON.stringify(authResult)}`,
      );

      if (authResult.errors && authResult.errors.length > 0) {
        this.logger.error(
          `[${correlationId}] Errores de Auth Service: ${JSON.stringify(authResult.errors)}`,
        );
        return {
          statusCode: authResult.statusCode || HttpStatus.BAD_REQUEST,
          message:
            authResult.message || 'Error en el servicio de autenticación.',
          errors: authResult.errors,
        };
      }

      const transformedAuthBody = deepTransformDates(authResult.body);
      accessToken = transformedAuthBody.accessToken;
      refreshToken = transformedAuthBody.refreshToken;
      user = transformedAuthBody.user;
      // Capturamos los tiempos de expiración devueltos por el microservicio
      accessTokenExpiresIn = transformedAuthBody.accessTokenExpiresIn; 
      refreshTokenExpiresIn = transformedAuthBody.refreshTokenExpiresIn; 
      
      this.logger.debug(
        `[${correlationId}] Datos de usuario y tokens del Auth Service transformados.`,
      );

      // 2. LLAMADA AL MICROSERVICIO DE SIDEBAR (Sidebar Service)
      // Solo si el login fue exitoso y tenemos un usuario y accessToken
      if (user && accessToken) {
        this.logger.debug(
          `[${correlationId}] Enviando 'sidebar_get_user_menu' a Sidebar Service para userId: ${user.id}`,
        );
        const sidebarMenuResult = await firstValueFrom(
          this.authServiceClient // Asegúrate de que este 'ClientProxy' pueda comunicarse con el Sidebar Service
            .send(
              { cmd: 'sidebar_get_user_menu' }, 
              {
                correlationId,
                userId: user.id,
                authorization: `Bearer ${accessToken}`, // Asegúrate de añadir "Bearer " si el sidebar espera el formato completo
              },
            )
            .pipe(
              timeout(10000), // Timeout para esta llamada
            ),
        );
        this.logger.debug(
          `[${correlationId}] RAW_MICROSERVICE_RESPONSE from Sidebar Service: ${JSON.stringify(sidebarMenuResult)}`,
        );

        if (sidebarMenuResult.errors && sidebarMenuResult.errors.length > 0) {
          this.logger.error(
            `[${correlationId}] Errores de Sidebar Service: ${JSON.stringify(sidebarMenuResult.errors)}`,
          );
          return {
            statusCode:
              sidebarMenuResult.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            message:
              sidebarMenuResult.message ||
              'Error al obtener el menú del sidebar.',
            errors: sidebarMenuResult.errors,
          };
        }

        menuItems = deepTransformDates(sidebarMenuResult.body.menuItems);
        this.logger.debug(
          `[${correlationId}] Datos del menú del Sidebar Service transformados.`,
        );
      } else {
        this.logger.warn(
          `[${correlationId}] Usuario o accessToken no disponibles para solicitar menú del sidebar.`,
        );
      }

      // 3. COMBINAR Y RETORNAR LA RESPUESTA FINAL AL GATEWAY
      this.logger.log(
        `[${correlationId}] Orquestación de login completada exitosamente.`,
      );
      return {
        statusCode: HttpStatus.OK,
        body: {
          accessToken,
          refreshToken,
          user,
          menuItems,
          accessTokenExpiresIn, // ¡Añadido aquí!
          refreshTokenExpiresIn, // ¡Añadido aquí!
        },
        message: 'Login exitoso y menú cargado.',
      };
    } catch (error: any) {
      this.logger.error(
        `[${correlationId}] Error en la orquestación de login: ${error.message}`,
        error.stack,
      );

      if (error instanceof RpcException) {
        const rpcError = error.getError() as {
          statusCode?: number;
          message?: string;
          errors?: OrchestratorError[];
        };
        return {
          statusCode: rpcError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            rpcError.message ||
            'Error en el microservicio remoto durante el login.',
          errors: rpcError.errors || [{ message: 'Error RPC desconocido.' }],
        };
      }

      if (error.name === 'TimeoutError') {
        return {
          statusCode: HttpStatus.GATEWAY_TIMEOUT,
          message: `El microservicio no respondió a tiempo: ${error.message}`,
          errors: [{ message: `Timeout: ${error.message}` }],
        };
      }
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error interno del Gateway al orquestar el login.',
        errors: [
          { message: error.message || 'Error inesperado en el orquestador.' },
        ],
      };
    }
  }

  // ¡NUEVO MÉTODO: orchestrateRefresh para el refresh token!
  async orchestrateRefresh(
    refreshToken: string,
    correlationId: string,
  ): Promise<OrchestratorResult<AuthResponse>> {
    this.logger.log(`[${correlationId}] [LoginOrchestrator] Iniciando orquestación de refresh token.`);

    let accessToken: string;
    let newRefreshToken: string; // Para el refresh token rotado
    let user: User;
    let menuItems: MenuItem[] | undefined;
    let accessTokenExpiresIn: number | undefined;
    let refreshTokenExpiresIn: number | undefined;

    try {
      // 1. LLAMADA AL MICROSERVICIO DE AUTENTICACIÓN PARA REFRESH
      this.logger.debug(`[${correlationId}] Enviando 'refresh_request' a Auth Service.`);
      const refreshResult = await firstValueFrom(
        this.authServiceClient
          .send({ cmd: 'refresh_request' }, { correlationId, refreshToken }) // Envía el refresh token
          .pipe(
            timeout(10000), // Timeout
          ),
      );
      this.logger.debug(`[${correlationId}] RAW_MICROSERVICE_RESPONSE from Auth Service (Refresh): ${JSON.stringify(refreshResult)}`);

      if (refreshResult.errors && refreshResult.errors.length > 0) {
        this.logger.error(`[${correlationId}] Errores de Auth Service (Refresh): ${JSON.stringify(refreshResult.errors)}`);
        return {
          statusCode: refreshResult.statusCode || HttpStatus.UNAUTHORIZED,
          message: refreshResult.message || 'Error en el servicio de autenticación al refrescar.',
          errors: refreshResult.errors,
        };
      }

      const transformedRefreshBody = deepTransformDates(refreshResult.body);
      accessToken = transformedRefreshBody.accessToken;
      newRefreshToken = transformedRefreshBody.refreshToken; // Recibe el nuevo refresh token
      user = transformedRefreshBody.user;
      accessTokenExpiresIn = transformedRefreshBody.accessTokenExpiresIn;
      refreshTokenExpiresIn = transformedRefreshBody.refreshTokenExpiresIn;

      this.logger.debug(`[${correlationId}] Datos de usuario del Auth Service transformados (Refresh).`);

      // 2. LLAMADA AL MICROSERVICIO DE SIDEBAR (Sidebar Service) - Opcional, si tu microservicio de auth no devuelve los items de menú
      if (user && accessToken && (!transformedRefreshBody.menuItems || transformedRefreshBody.menuItems.length === 0)) {
        this.logger.debug(
          `[${correlationId}] Enviando 'sidebar_get_user_menu' a Sidebar Service para userId: ${user.id} después del refresh.`,
        );
        const sidebarMenuResult = await firstValueFrom(
          this.authServiceClient
            .send(
              { cmd: 'sidebar_get_user_menu' },
              {
                correlationId,
                userId: user.id,
                authorization: `Bearer ${accessToken}`, // Usa el NUEVO Access Token
              },
            )
            .pipe(
              timeout(10000),
            ),
        );
        if (sidebarMenuResult.errors && sidebarMenuResult.errors.length > 0) {
          this.logger.warn(`[${correlationId}] Errores al obtener menú de Sidebar después de refresh: ${JSON.stringify(sidebarMenuResult.errors)}`);
        } else {
          menuItems = deepTransformDates(sidebarMenuResult.body.menuItems);
          this.logger.debug(`[${correlationId}] Datos del menú del Sidebar Service transformados después del refresh.`);
        }
      } else if (transformedRefreshBody.menuItems) {
         menuItems = transformedRefreshBody.menuItems;
      }


      // 3. COMBINAR Y RETORNAR LA RESPUESTA FINAL AL GATEWAY
      this.logger.log(`[${correlationId}] Orquestación de refresh completada exitosamente.`);
      return {
        statusCode: HttpStatus.OK,
        body: {
          accessToken,
          refreshToken: newRefreshToken, // Retorna el nuevo refresh token
          user,
          menuItems,
          accessTokenExpiresIn,
          refreshTokenExpiresIn,
        },
        message: 'Tokens refrescados exitosamente.',
      };

    } catch (error: any) {
      this.logger.error(`[${correlationId}] Error en la orquestación de refresh: ${error.message}`, error.stack);
      if (error instanceof RpcException) {
        const rpcError = error.getError() as { statusCode?: number; message?: string; errors?: OrchestratorError[]; };
        return {
          statusCode: rpcError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
          message: rpcError.message || 'Error en el microservicio remoto durante el refresh.',
          errors: rpcError.errors || [{ message: 'Error RPC desconocido.' }],
        };
      }
      if (error.name === 'TimeoutError') {
        return {
          statusCode: HttpStatus.GATEWAY_TIMEOUT,
          message: `El microservicio no respondió a tiempo: ${error.message}`,
          errors: [{ message: `Timeout: ${error.message}` }],
        };
      }
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error interno del Gateway al orquestar el refresh.',
        errors: [{ message: error.message || 'Error inesperado en el orquestador.' }],
      };
    }
  }
}