import { HttpStatus, Inject, Injectable, Logger, Scope, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface';
import { deepTransformDates } from 'src/common/utils/date.utils';
import { CreateUserInput } from 'src/users/dto/create-user.input';
import {
  CREATE_USER_MUTATION,
  FIND_ALL_USERS_QUERY,
  SEARCH_USERS_QUERY,
  UPDATE_USER_MUTATION,
  UPDATE_USER_STATUS_MUTATION,
} from 'src/graphql-queries/user.query';
import { User } from 'src/common/interfaces/users.interface';
import { PaginationInput } from 'src/common/dto/pagination.input';
import { PaginatedUsers } from 'src/common/models/paginated-users.model';
import { UpdateUserInput } from 'src/users/dto/update-user.input';
import { UpdateUserStatusInput } from 'src/users/dto/update-user-status.input';
import { REQUEST } from '@nestjs/core'; // Todavía lo inyectamos por si lo usas en otros lados
import { FastifyRequest } from 'fastify';
import { AuthenticatedUser } from 'src/common/interfaces/authenticated-user.interface'; // Importa la interfaz

@Injectable({ scope: Scope.REQUEST })
export class UsersOrchestrator {
  private readonly logger = new Logger(UsersOrchestrator.name);
  constructor(
    @Inject('NATS_SERVICE') private authServiceClient: ClientProxy,
    @Inject(REQUEST) private request: FastifyRequest, // Mantenemos la inyección por si la necesitas para otras cosas
  ) {}

  private async sendGraphqlRequest<T = any>(
    correlationId: string,
    query: string,
    variables: any,
    operationName: string = 'GraphQL Operation',
    authToken: string, // <-- ¡NUEVO PARÁMETRO: El token de autorización!
  ): Promise<OrchestratorResult<T>> {
    this.logger.log(
      `[${correlationId}] [Users Orchestrator] Enviando solicitud a Auth Service para ${operationName} vía NATS.`,
    );

    const headersToSend: { [key: string]: string } = {
      'X-Correlation-ID': correlationId,
    };

    // Usamos el token que llega como argumento directamente
    if (authToken) {
      headersToSend['Authorization'] = `Bearer ${authToken}`;
      this.logger.debug(`[${correlationId}] Authorization Header agregado para ${operationName} (obtenido explícitamente).`);
    } else {
      // Esto no debería suceder si el resolver ya lo validó, pero es un fallback
      this.logger.error(`[${correlationId}] Petición a ${operationName} sin token de autorización explícito en el orquestador. Esto NO DEBERÍA OCURRIR.`);
      throw new UnauthorizedException('Token de autorización ausente en el orquestador.');
    }

    try {
      const response = await firstValueFrom(
        this.authServiceClient
          .send(
            { cmd: 'graphql_request' },
            {
              query: query,
              variables: variables,
              headers: headersToSend,
            },
          )
          .pipe(timeout(10000)),
      );

      if (response && response.errors && response.errors.length > 0) {
        this.logger.error(
          `[${correlationId}] [Users Orchestrator] Errores de GraphQL del Auth Service al ${operationName}: ${JSON.stringify(response.errors)}`,
        );
        return {
          statusCode: response.statusCode || HttpStatus.BAD_REQUEST,
          errors: response.errors,
          message:
            response.errors[0]?.message ||
            `Error desconocido del Auth Service al ${operationName}.`,
          body: undefined,
        };
      }

      this.logger.log(
        `[${correlationId}] [Users Orchestrator] ${operationName} exitosamente por Auth Service.`,
      );

      const transformedData = deepTransformDates(response.data);
      this.logger.debug(
        `[${correlationId}] Datos de respuesta del Auth Service transformados con deepTransformDates.`,
      );

      return {
        statusCode: HttpStatus.OK,
        body: transformedData,
        errors: undefined,
        message: `${operationName} exitosamente.`,
      };
    } catch (error: any) {
      this.logger.error(
        `[${correlationId}] [Users Orchestrator] Error en la comunicación con Auth Service o error inesperado durante ${operationName}: ${error.message}`,
        error.stack,
      );
      return {
        statusCode:
          error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        errors: error.errors || [
          { message: error.message || 'Error desconocido en el orquestador.' },
        ],
        message: `Error interno del Gateway al comunicarse con el servicio de autenticación para ${operationName}.`,
        body: undefined,
      };
    }
  }

  // --- MÉTODOS PÚBLICOS DEL ORQUESTADOR CON NUEVO PARÁMETRO authToken ---

  async createUser(
    createUserInput: CreateUserInput,
    correlationId: string,
    authToken: string, // <-- Nuevo parámetro
  ): Promise<OrchestratorResult> {
    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para crear usuario.`);
    this.logger.debug(`[${correlationId}] Argumento 'createUserInput' recibido: ${JSON.stringify(createUserInput)}`);

    const result = await this.sendGraphqlRequest(
      correlationId,
      CREATE_USER_MUTATION,
      { createUserInput: createUserInput },
      'crear usuario',
      authToken, // <-- Pasando el token
    );
    if (result.errors) {
      return result;
    }
    result.body = result.body.createUser;
    return result;
  }

  async findAllUsers(
    correlationId: string,
    paginationInput: PaginationInput,
    authToken: string, // <-- Nuevo parámetro
  ): Promise<OrchestratorResult> {
    this.logger.log(`[${correlationId}] [Users Orchestrator] Iniciando orquestación para traer todos los usuarios con paginación.`);
    const result = await this.sendGraphqlRequest(
      correlationId,
      FIND_ALL_USERS_QUERY,
      { paginationInput: paginationInput },
      'obtener usuarios paginados',
      authToken, // <-- Pasando el token
    );
    if (result.errors) {
      return result;
    }
    result.body = result.body.findAllUsers as PaginatedUsers;
    return result;
  }

  async updateUser(
    correlationId: string,
    id: number,
    updateUserInput: UpdateUserInput,
    authToken: string, // <-- Nuevo parámetro
  ): Promise<OrchestratorResult> {
    this.logger.log(`[${correlationId}] [Users Orchestrator] Iniciando orquestación para actualizar usuario con ID: ${id}.`);

    const result = await this.sendGraphqlRequest(
      correlationId,
      UPDATE_USER_MUTATION,
      { id: id, updateUserInput: updateUserInput },
      'actualizar usuario',
      authToken, // <-- Pasando el token
    );
    if (result.errors) {
      return result;
    }
    result.body = result.body.updateUser as User;
    return result;
  }

  async updateUserStatus(
    correlationId: string,
    id: number,
    updateUserStatusInput: UpdateUserStatusInput,
    authToken: string, // <-- Nuevo parámetro
  ): Promise<OrchestratorResult> {
    this.logger.log(`[${correlationId}] [Users Orchestrator] Iniciando orquestación para actualizar estado de usuario con ID: ${id}.`);

    const result = await this.sendGraphqlRequest(
      correlationId,
      UPDATE_USER_STATUS_MUTATION,
      { id, updateUserStatusInput: updateUserStatusInput },
      'updateUserStatus',
      authToken, // <-- Pasando el token
    );

    if (result.errors) {
      this.logger.warn(`[${correlationId}] Errores en la respuesta del microservicio al actualizar estado de usuario: ${JSON.stringify(result.errors)}`);
      return result;
    }

    result.body = result.body.updateUserStatus as User;
    return result;
  }

  async searchUsers(
    correlationId: string,
    paginationInput: PaginationInput,
    authToken: string, // <-- Nuevo parámetro
  ): Promise<OrchestratorResult> {
    this.logger.log(`[${correlationId}] [Users Orchestrator] Iniciando orquestación para buscar y filtrar usuarios.`);

    const result = await this.sendGraphqlRequest(
      correlationId,
      SEARCH_USERS_QUERY,
      { paginationInput: paginationInput },
      'searchUsers',
      authToken, // <-- Pasando el token
    );

    if (result.errors) {
      this.logger.warn(`[${correlationId}] Errores en la respuesta del microservicio al buscar usuarios: ${JSON.stringify(result.errors)}`);
      return result;
    }

    result.body = result.body.searchUsers as PaginatedUsers;
    return result;
  }
}