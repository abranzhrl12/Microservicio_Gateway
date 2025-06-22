import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface';
import { deepTransformDates } from 'src/common/utils/date.utils';
import { create } from 'domain';
import { CreateUserInput } from 'src/users/dto/create-user.input';
import { CREATE_USER_MUTATION, FIND_ALL_USERS_QUERY, SEARCH_USERS_QUERY, UPDATE_USER_MUTATION, UPDATE_USER_STATUS_MUTATION } from 'src/graphql-queries/user.query';
import { User } from 'src/common/interfaces/users.interface';
import { PaginationInput } from 'src/common/dto/pagination.input';
import { PaginatedUsers } from 'src/common/models/paginated-users.model';
import { UpdateUserInput } from 'src/users/dto/update-user.input';
import { UpdateUserStatusInput } from 'src/users/dto/update-user-status.input';

@Injectable()
export class UsersOrchestrator {
  private readonly logger = new Logger(UsersOrchestrator.name);
  constructor(@Inject('NATS_SERVICE') private authServiceClient: ClientProxy) {}

  private async sendGraphqlRequest<T = any>(
    correlationId: string,
    query: string,
    variables: any,
    authorizationHeader?: string,
    operationName: string = 'GraphQL Operation',
  ): Promise<OrchestratorResult<T>> {
    this.logger.log(
      `[${correlationId}] [Users Orchestrator] Enviando solicitud a Auth Service para ${operationName} vía NATS.`,
    );

    const headersToSend: { [key: string]: string } = {
      'X-Correlation-ID': correlationId,
    };

    if (authorizationHeader) {
      headersToSend['Authorization'] = authorizationHeader;
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

      // ¡¡¡CAMBIO CLAVE AQUÍ: APLICAR deepTransformDates AL response.data!!!
      const transformedData = deepTransformDates(response.data);
      this.logger.debug(
        `[${correlationId}] Datos de respuesta del Auth Service transformados con deepTransformDates.`,
      );

      return {
        statusCode: HttpStatus.OK,
        body: transformedData, // Devolver los datos transformados
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

  async createUser(
    createUserInput: CreateUserInput,
    correlationId: string,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    // O el tipo de dato que realmente devuelvas, como `User`
    this.logger.log(
      `[${correlationId}] Recibida mutación GraphQL para crear usuario.`,
    );
    this.logger.debug(
      `[${correlationId}] Argumento 'createUserInput' recibido: ${JSON.stringify(createUserInput)}`,
    );
    this.logger.debug(
      `[${correlationId}] Argumento 'authorizationHeader' recibido: ${JSON.stringify(authorizationHeader)}`,
    );

    // Aquí utilizas la constante de la mutación GraphQL
    const result = await this.sendGraphqlRequest(
      correlationId,
      CREATE_USER_MUTATION, // <-- ¡Aquí va la mutación!
      { createUserInput: createUserInput }, // Las variables de GraphQL
      authorizationHeader,
      'crear usuario', // Descripción para logs o errores
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
    authorizationHeader?: string
  ):Promise<OrchestratorResult>{
    this.logger.log(
      `[${correlationId}] [Users Orchestrator] Iniciando orquestación para traer todos los usuarios con paginación.`,
    )
    const result= await this.sendGraphqlRequest(
      correlationId,
      FIND_ALL_USERS_QUERY,
      { paginationInput: paginationInput },
      authorizationHeader,
      'obtener usuarios paginados',
    )
    if(result.errors){
      return result
    }
    result.body = result.body.findAllUsers as PaginatedUsers
    return result

  }
  async updateUser(
    id: number,
    updateUserInput: UpdateUserInput,
    correlationId: string,
    authorizationHeader?: string
  ):Promise<OrchestratorResult>{
    this.logger.log(
      `[${correlationId}] [Users Orchestrator] Iniciando orquestación para actualizar usuario con ID: ${id}.`,
    )

    const result= await this.sendGraphqlRequest(
      correlationId,
      UPDATE_USER_MUTATION,
      { id: id, updateUserInput: updateUserInput },
      authorizationHeader,
      'actualizar usuario',
    )
    if(result.errors){
      return result
    }
    result.body = result.body.updateUser

    return result;

  }

  async updateUserStatus(
    correlationId: string,
    id: number,
    updateUserStatusInput: UpdateUserStatusInput,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Users Orchestrator] Iniciando orquestación para actualizar estado de usuario con ID: ${id}.`,
    );

    const result = await this.sendGraphqlRequest(
      correlationId,
      UPDATE_USER_STATUS_MUTATION, // Usamos la nueva mutación definida
      { id, updateUserStatusInput: updateUserStatusInput }, // Pasamos el ID y el input
      authorizationHeader,
      'updateUserStatus', // Nombre de la operación GraphQL
    );

    if (result.errors) {
      this.logger.warn(`[${correlationId}] Errores en la respuesta del microservicio al actualizar estado de usuario: ${JSON.stringify(result.errors)}`);
      return result;
    }

    // El resultado del microservicio tendrá el cuerpo de la respuesta GraphQL,
    // que contendrá el objeto 'updateUserStatus'
    result.body = result.body.updateUserStatus as User; // Extrae el usuario actualizado del body
    return result;
  }

  async searchUsers(
    correlationId: string,
    paginationInput: PaginationInput,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Users Orchestrator] Iniciando orquestación para buscar y filtrar usuarios.`,
    );

    const result = await this.sendGraphqlRequest(
      correlationId,
      SEARCH_USERS_QUERY, // Usamos la nueva query definida
      { paginationInput: paginationInput }, // Pasamos el input de paginación y filtros
      authorizationHeader,
      'searchUsers', // Nombre de la operación GraphQL
    );

    if (result.errors) {
      this.logger.warn(`[${correlationId}] Errores en la respuesta del microservicio al buscar usuarios: ${JSON.stringify(result.errors)}`);
      return result;
    }

    // El resultado del microservicio tendrá el cuerpo de la respuesta GraphQL,
    // que contendrá el objeto 'searchUsers' (PaginatedUsers)
    result.body = result.body.searchUsers as PaginatedUsers; // Extrae el resultado paginado del body
    return result;
  }
}
