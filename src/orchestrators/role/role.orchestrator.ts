// src/orchestrators/role/role.orchestrator.ts (EN TU API GATEWAY - CORREGIDO)
import { Injectable, Inject, Logger, HttpStatus } from '@nestjs/common';
import {  createRoleMutation, findAllRolesQuery,findRoleByIdQuery,removeRoleMutation,updateRoleMutation ,ASSIGN_PERMISSIONS_TO_ROLE_MUTATION} from 'src/graphql-queries';
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface';
import { firstValueFrom,timeout } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { PaginationInput } from 'src/common/dto/pagination.input';
import { PaginatedRoles } from 'src/common/interfaces/paginated-roles.interface';
import { deepTransformDates, transformDates } from 'src/common/utils/date.utils';
import { CreateRoleInput } from '../../roles/dto/create-role.input';
import { UpdateRoleInput } from '../../roles/dto/update-role.input';
import { Role } from 'src/common/interfaces/role.interface';




@Injectable()
export class RoleOrchestrator {
  private readonly logger = new Logger(RoleOrchestrator.name);

  constructor(
    @Inject('NATS_SERVICE') private authServiceClient: ClientProxy,
  ) {}


  private async sendGraphqlRequest<T = any>(
    correlationId: string,
    query: string,
    variables: any,
    authorizationHeader?: string,
    operationName: string = 'GraphQL Operation',
  ): Promise<OrchestratorResult<T>>  {
    this.logger.log(
      `[${correlationId}] [Role Orchestrator] Enviando solicitud a Auth Service para ${operationName} vía NATS.`,
    );

    const headersToSend: { [key: string]: string } = {
      'X-Correlation-ID': correlationId,
    };

    if (authorizationHeader) {
      headersToSend['Authorization'] = authorizationHeader;
    }

    try {
      const response = await firstValueFrom(
        this.authServiceClient.send(
          { cmd: 'graphql_request' },
          {
            query: query,
            variables: variables,
            headers: headersToSend,
          },
        ).pipe(
          timeout(10000), 
        ),
      );
       this.logger.error(`[${correlationId}] RAW_MICROSERVICE_RESPONSE for ${operationName}: ${JSON.stringify(response)}`);
      if (response && response.errors && response.errors.length > 0) {
        this.logger.error(
          `[${correlationId}] [Role Orchestrator] Errores de GraphQL del Auth Service al ${operationName}: ${JSON.stringify(response.errors)}`,
        );
        return {
          statusCode: response.statusCode || HttpStatus.BAD_REQUEST,
          errors: response.errors,
          message:
            response.errors[0]?.message || `Error desconocido del Auth Service al ${operationName}.`,
          body: undefined,
        };
      }

      this.logger.log(
        `[${correlationId}] [Role Orchestrator] ${operationName} exitosamente por Auth Service.`,
      );

      // ¡¡¡CAMBIO CLAVE AQUÍ: APLICAR deepTransformDates AL response.data!!!
      const transformedData = deepTransformDates(response.data);
      this.logger.debug(`[${correlationId}] Datos de respuesta del Auth Service transformados con deepTransformDates.`);

      return {
        statusCode: HttpStatus.OK,
        body: transformedData, // Devolver los datos transformados
        errors: undefined,
        message: `${operationName} exitosamente.`,
      };
    } catch (error: any) {
      this.logger.error(
        `[${correlationId}] [Role Orchestrator] Error en la comunicación con Auth Service o error inesperado durante ${operationName}: ${error.message}`,
        error.stack,
      );
      return {
        statusCode:
          error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        errors: error.errors || [
          { message: error.message || 'Error desconocido en el orquestador.' },
        ],
        message:
          `Error interno del Gateway al comunicarse con el servicio de autenticación para ${operationName}.`,
        body: undefined,
      };
    }
  }

  async createRole(
    createRoleInput: CreateRoleInput,
    correlationId: string,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Role Orchestrator] Iniciando orquestación para crear rol.`,
    );

    const result = await this.sendGraphqlRequest(
      correlationId,
      createRoleMutation,
      { createRoleInput: createRoleInput },
      authorizationHeader,
      'crear rol',
    );

    if (result.errors) {
      return result;
    }

    result.body = result.body.createRole; 
    return result;
  }

  async findAllRoles(
    correlationId: string,
    paginationInput: PaginationInput,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Role Orchestrator] Iniciando orquestación para traer todos los roles con paginación.`,
    );

    const result = await this.sendGraphqlRequest(
      correlationId,
      findAllRolesQuery,
      { paginationInput: paginationInput },
      authorizationHeader,
      'obtener roles paginados',
    );

    if (result.errors) {
      return result;
    }
    result.body = result.body.findAllRoles as PaginatedRoles;
    return result;
  }

  async updateRole(
    id: string,
    updateRoleInput: UpdateRoleInput,
    correlationId: string,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Role Orchestrator] Iniciando orquestación para actualizar rol con ID: ${id}.`,
    );

    const result = await this.sendGraphqlRequest(
      correlationId,
      updateRoleMutation,
      { id: id, updateRoleInput: updateRoleInput },
      authorizationHeader,
      'actualizar rol',
    );

    if (result.errors) {
      return result;
    }

    result.body = result.body.updateRole;
    return result;
  }
  
  async removeRole(
    id: string,
    correlationId: string,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Role Orchestrator] Iniciando orquestación para eliminar rol con ID: ${id}.`,
    );

    const result = await this.sendGraphqlRequest(
      correlationId,
      removeRoleMutation, // La mutación GraphQL para eliminar rol
      { id: id }, // Las variables que necesita el microservicio de Auth
      authorizationHeader,
      'eliminar rol',
    );

    if (result.errors) {
      // El microservicio ya maneja NotFoundException y BadRequestException,
      // aquí solo propagamos esos errores como OrchestratorResult
      return result; 
    }
    result.body = result.body.removeRole; 
    return result;
  }

    // *** NUEVO MÉTODO findRoleById EN EL ORCHESTRATOR ***
  async findRoleById(
    id: string,
    correlationId: string,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Role Orchestrator] Iniciando orquestación para buscar rol con ID: ${id}.`,
    );

    const result = await this.sendGraphqlRequest(
      correlationId,
      findRoleByIdQuery, // La query GraphQL para buscar por ID
      { id: id }, // Las variables que necesita el microservicio de Auth
      authorizationHeader,
      'buscar rol por ID',
    );

    if (result.errors) {
      // El microservicio ya maneja NotFoundException, aquí solo propagamos esos errores
      return result; 
    }

    // El resultado esperado del microservicio es un objeto Role.
    // Como deepTransformDates ya se aplica en sendGraphqlRequest, las fechas ya estarán transformadas.
    result.body = result.body.findRoleById; 
    return result;
  }

   // --- ¡NUEVO MÉTODO PARA ASIGNAR PERMISOS A ROLES! ---
  async assignPermissionsToRole(
    roleId: number,
    permissionIds: string[],
    correlationId: string,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult<Role>> {
    this.logger.log(
      `[${correlationId}] [Roles Orchestrator] Iniciando orquestación para asignar permisos a rol con ID: ${roleId}.`,
    );

    const result = await this.sendGraphqlRequest<any>(
      correlationId,
      ASSIGN_PERMISSIONS_TO_ROLE_MUTATION, // Usar la GraphQL mutation definida
      { assignPermissionsToRoleInput: { roleId, permissionIds } }, // Pasar los argumentos al microservicio
      authorizationHeader,
      'asignar permisos a rol',
    );

    if (result.errors && result.errors.length > 0) {
      return result;
    }
    
    if (!result.body) {
        // Manejar el caso donde no hay body pero tampoco errores explícitos del microservicio
        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            errors: [{ message: 'Respuesta inesperada del microservicio de autenticación: cuerpo vacío.' }],
            message: 'Error interno del Gateway: respuesta incompleta.',
            body: undefined
        };
    }

    result.body = result.body.assignPermissionsToRole as Role;
    return result;
  }

}
