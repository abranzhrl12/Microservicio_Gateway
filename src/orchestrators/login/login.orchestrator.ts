// // src/orchestrators/login/login.orchestrator.ts (ARCHIVO COMPLETO Y CORREGIDO PARA EL GATEWAY)

// import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
// import { ClientProxy, RpcException } from '@nestjs/microservices';
// import { firstValueFrom, timeout } from 'rxjs';
// import { LoginInputDto } from 'src/auth/dto/login-input.dto';
// import { AuthResponse } from 'src/auth/models/auth-response.model';

// import {
//   OrchestratorError,
//   OrchestratorResult,
// } from 'src/common/interfaces/orchestrator-result.interface';
// import { deepTransformDates } from 'src/common/utils/date.utils';
// import { MenuItem } from 'src/menu-items/interfaces/menu-item.interace';

// @Injectable()
// export class LoginOrchestrator {
//   private readonly logger = new Logger(LoginOrchestrator.name);
//   constructor(@Inject('NATS_SERVICE') private authServiceClient: ClientProxy) {}

//   async orchestrateLogin(
//     loginInput: LoginInputDto,
//     correlationId: string,
//   ): Promise<OrchestratorResult<AuthResponse>> {
//     this.logger.log(
//       `[${correlationId}] [LoginOrchestrator] Iniciando orquestación de login.`,
//     );

//     let accessToken: string;
//     let refreshToken: string;
//     let user: any; // El tipo User exacto de tu AuthResponse
//     let menuItems: MenuItem[] | undefined; // Usar SidebarItem según tu definición

//     try {
//       // 1. LLAMADA AL MICROSERVICIO DE AUTENTICACIÓN (Auth Service)
//       this.logger.debug(
//         `[${correlationId}] Enviando 'login_request' a Auth Service.`,
//       ); // <--- LOG ACTUALIZADO
//       const authResult = await firstValueFrom(
//         // ¡ESTE ES EL CAMBIO CLAVE EN EL GATEWAY!
//         // Cambiamos 'graphql_request' a 'login_request' para que coincida con el nuevo @MessagePattern
//         // en el microservicio de autenticación.
//         this.authServiceClient
//           .send({ cmd: 'login_request' }, { correlationId, loginInput })
//           .pipe(
//             timeout(10000), // Timeout para esta llamada
//           ),
//       );
//       this.logger.debug(
//         `[${correlationId}] RAW_MICROSERVICE_RESPONSE from Auth Service: ${JSON.stringify(authResult)}`,
//       ); // Manejo de errores de Auth Service

//       if (authResult.errors && authResult.errors.length > 0) {
//         this.logger.error(
//           `[${correlationId}] Errores de Auth Service: ${JSON.stringify(authResult.errors)}`,
//         );
//         return {
//           statusCode: authResult.statusCode || HttpStatus.BAD_REQUEST,
//           message:
//             authResult.message || 'Error en el servicio de autenticación.',
//           errors: authResult.errors,
//         };
//       } // Aplicar deepTransformDates a los datos del usuario si Auth Service devuelve fechas

//       const transformedAuthBody = deepTransformDates(authResult.body);
//       accessToken = transformedAuthBody.accessToken;
//       refreshToken = transformedAuthBody.refreshToken;
//       user = transformedAuthBody.user;
//       this.logger.debug(
//         `[${correlationId}] Datos de usuario del Auth Service transformados.`,
//       ); // 2. LLAMADA AL MICROSERVICIO DE SIDEBAR (Sidebar Service)
//       // Solo si el login fue exitoso y tenemos un usuario y accessToken

//       if (user && accessToken) {
//         this.logger.debug(
//           `[${correlationId}] Enviando 'sidebar_get_user_menu' a Sidebar Service para userId: ${user.id}`,
//         );
//         const sidebarMenuResult = await firstValueFrom(
//           // CORREGIDO: Usar this.authServiceClient (esto ya estaba bien)
//           this.authServiceClient
//             .send(
//               { cmd: 'sidebar_graphql_request' },
//               {
//                 correlationId,
//                 userId: user.id, // Pasar el token de acceso para que Sidebar Service pueda validarlo y obtener permisos
//                 authorization: accessToken, // No necesitas 'Bearer ' aquí, Sidebar Listener lo manejará
//               },
//             )
//             .pipe(
//               timeout(10000), // Timeout para esta llamada
//             ),
//         );
//         this.logger.debug(
//           `[${correlationId}] RAW_MICROSERVICE_RESPONSE from Sidebar Service: ${JSON.stringify(sidebarMenuResult)}`,
//         ); // Manejo de errores de Sidebar Service

//         if (sidebarMenuResult.errors && sidebarMenuResult.errors.length > 0) {
//           this.logger.error(
//             `[${correlationId}] Errores de Sidebar Service: ${JSON.stringify(sidebarMenuResult.errors)}`,
//           );
//           return {
//             statusCode:
//               sidebarMenuResult.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
//             message:
//               sidebarMenuResult.message ||
//               'Error al obtener el menú del sidebar.',
//             errors: sidebarMenuResult.errors,
//           };
//         } // Aplicar deepTransformDates a los ítems del menú si Sidebar Service devuelve fechas

//         menuItems = deepTransformDates(sidebarMenuResult.body.menuItems);
//         this.logger.debug(
//           `[${correlationId}] Datos del menú del Sidebar Service transformados.`,
//         );
//       } else {
//         this.logger.warn(
//           `[${correlationId}] Usuario o accessToken no disponibles para solicitar menú del sidebar.`,
//         );
//       } // 3. COMBINAR Y RETORNAR LA RESPUESTA FINAL AL FRONTEND

//       this.logger.log(
//         `[${correlationId}] Orquestación de login completada exitosamente.`,
//       );
//       return {
//         statusCode: HttpStatus.OK,
//         body: {
//           accessToken,
//           refreshToken,
//           user,
//           menuItems, // Incluir los ítems del menú (pueden ser undefined si no se pudieron obtener)
//         },
//         message: 'Login exitoso y menú cargado.',
//       };
//     } catch (error: any) {
//       this.logger.error(
//         `[${correlationId}] Error en la orquestación de login: ${error.message}`,
//         error.stack,
//       ); // Manejo de RpcException (errores lanzados por los microservicios)

//       if (error instanceof RpcException) {
//         const rpcError = error.getError() as {
//           statusCode?: number;
//           message?: string;
//           errors?: OrchestratorError[];
//         };
//         return {
//           statusCode: rpcError.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
//           message:
//             rpcError.message ||
//             'Error en el microservicio remoto durante el login.',
//           errors: rpcError.errors || [{ message: 'Error RPC desconocido.' }],
//         };
//       } // Manejo de errores de timeout (desde el pipe(timeout(X)))

//       if (error.name === 'TimeoutError') {
//         return {
//           statusCode: HttpStatus.GATEWAY_TIMEOUT,
//           message: `El microservicio no respondió a tiempo: ${error.message}`,
//           errors: [{ message: `Timeout: ${error.message}` }],
//         };
//       }
//       return {
//         statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
//         message: 'Error interno del Gateway al orquestar el login.',
//         errors: [
//           { message: error.message || 'Error inesperado en el orquestador.' },
//         ],
//       };
//     }
//   }
// }


// src/orchestrators/login/login.orchestrator.ts

import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { LoginInputDto } from 'src/auth/dto/login-input.dto';
import { AuthResponse } from 'src/auth/models/auth-response.model';

import {
  OrchestratorError,
  OrchestratorResult,
} from 'src/common/interfaces/orchestrator-result.interface';
import { deepTransformDates } from 'src/common/utils/date.utils';
import { MenuItem } from 'src/menu-items/interfaces/menu-item.interace';

@Injectable()
export class LoginOrchestrator {
  private readonly logger = new Logger(LoginOrchestrator.name);
  constructor(@Inject('NATS_SERVICE') private authServiceClient: ClientProxy) {} // ¡Revisa si este cliente es el correcto para Sidebar!

  async orchestrateLogin(
    loginInput: LoginInputDto,
    correlationId: string,
  ): Promise<OrchestratorResult<AuthResponse>> {
    this.logger.log(
      `[${correlationId}] [LoginOrchestrator] Iniciando orquestación de login.`,
    );

    let accessToken: string;
    let refreshToken: string;
    let user: any; // El tipo User exacto de tu AuthResponse
    let menuItems: MenuItem[] | undefined; // Usar SidebarItem según tu definición

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
      this.logger.debug(
        `[${correlationId}] Datos de usuario del Auth Service transformados.`,
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
              // *** ¡EL CAMBIO CLAVE ESTÁ AQUÍ! ***
              { cmd: 'sidebar_get_user_menu' }, // <--- ¡PATRÓN CORRECTO!
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

      // 3. COMBINAR Y RETORNAR LA RESPUESTA FINAL AL FRONTEND
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
}