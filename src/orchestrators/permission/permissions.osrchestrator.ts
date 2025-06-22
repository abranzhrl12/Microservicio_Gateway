// src/services/permission/permission.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  HttpStatus,
} from '@nestjs/common';


import {
  CREATE_PERMISSION_MUTATION,
  FIND_ALL_PERMISSIONS_QUERY,
  FIND_PERMISSION_BY_ID_QUERY,
  UPDATE_PERMISSION_MUTATION,
  REMOVE_PERMISSION_MUTATION,
  FIND_PERMISSION_BY_NAME_QUERY,
} from '../../graphql-queries/permission-management.graphql';

import {
  CreatePermissionInput,
  PermissionServiceResponse,
  RolePermissionsServiceResponse,
  PermissionOrchestratorResult, // Aunque el nombre del tipo contenga "OrchestratorResult", no es un sufijo de clase
  AssignPermissionsOrchestratorResult, // Igual aquí
  Permission,
  Role,
} from '../../common/interfaces/user-management.interface';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs'; 
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface';
import {
  deepTransformDates,
  transformDates,
} from '../../common/utils/date.utils';
import { PaginationInput } from 'src/common/dto/pagination.input';
import { PaginatedPermissions } from 'src/common/models/paginated-permissions.model';
import { UpdatePermissionInput } from 'src/permission/dto/update-permission.input';

@Injectable()
export class PermissionsOrchestrator {
  // <-- Nombre de clase ajustado
  private readonly logger = new Logger(PermissionsOrchestrator.name);
  constructor(@Inject('NATS_SERVICE') private authServiceClient: ClientProxy) {}

  private async sendGraphqlRequest<T = any>(
    correlationId: string,
    query: string,
    variables: any,
    authorizationHeader?: string,
    operationName: string = 'GraphQL Operation',
  ): Promise<OrchestratorResult<T>> {
    this.logger.log(
      `[${correlationId}] [Permission Orchestrator] Enviando solicitud a Auth Service para ${operationName} vía NATS.`,
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
          timeout(10000), // <-- ¡¡¡AÑADIDO EL TIMEOUT!!!
        ),
      );
      if (response && response.errors && response.errors.length > 0) {
        this.logger.error(
          `[${correlationId}] [Permission Orchestrator] Error al enviar la solicitud a Auth Service para ${operationName}: ${JSON.stringify(response.errors)}`,
        );
        return {
          statusCode: response.statusCode || HttpStatus.BAD_REQUEST,
          errors: response.errors,
          message:
            response.errors[0]?.message ||
            `Error al enviar la solicitud a Auth Service ${operationName}.`,
          body: undefined,
        };
      }
      this.logger.log(
        `[${correlationId}] [Permission Orchestrator] Respuesta de Auth Service para ${operationName}.`,
      );

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

    } catch (error) {
     this.logger.error(
        `[${correlationId}] [Role Orchestrator] Error en la comunicación con Auth Service o error inesperado durante ${operationName}: ${error.message}`,
        error.stack,
      );
      return{
        statusCode:
          error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        errors: error.errors || [
          { message: error.message || 'Error desconocido en el orquestador.' },
        ],
        message:
          `Error interno del Gateway al comunicarse con el servicio de autenticación para ${operationName}.`,
        body: undefined,
      }
    }
  }


  async createPermission(
    createPermissionInput: CreatePermissionInput,
    corrrelationId: string,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult>{
    this.logger.log(`[${corrrelationId}] [Permission Orchestrator] Creando permiso.`);
    const result= await this.sendGraphqlRequest(
      corrrelationId,
      CREATE_PERMISSION_MUTATION,
      { createPermissionInput: createPermissionInput },
      authorizationHeader,
      'crear permiso',
    ) 
    if(result.errors){
      return result
    }
    result.body = result.body.createPermission
    return result
}

async findAllPermissions(
  correlationId: string,
  paginationInput: PaginationInput,
  authorizationHeader?: string,
): Promise<OrchestratorResult> {
  this.logger.log(
    `[${correlationId}] [Permission Orchestrator] Iniciando orquestación para traer todos los permisos con paginación.`,
  )
  const result= await this.sendGraphqlRequest(
    correlationId,
    FIND_ALL_PERMISSIONS_QUERY,
    { paginationInput: paginationInput },
    authorizationHeader,
    'obtener permisos paginados',
  )
  if(result.errors){
    return result
  }
  result.body = result.body.findAllPermissions as PaginatedPermissions
  return result
}
async updatePermission(
    id: string,
    updatePermissionInput: UpdatePermissionInput,
    correlationId: string,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Role Orchestrator] Iniciando orquestación para actualizar permiso con ID: ${id}.`,
    )
    const result= await this.sendGraphqlRequest(
      correlationId,
      UPDATE_PERMISSION_MUTATION,
      { id: id, updatePermissionInput: updatePermissionInput },
      authorizationHeader,
      'actualizar permiso',
    )
    if(result.errors){
      return result

    }
    result.body = result.body.updatePermission
    return result
  }

  async removePermission(
    id: string,
    correlationId: string,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Role Orchestrator] Iniciando orquestación para eliminar permiso con ID: ${id}.`,
    )
    const result= await this.sendGraphqlRequest(
      correlationId,
      REMOVE_PERMISSION_MUTATION,
      { id: id },
      authorizationHeader,
      'eliminar permiso',
    )
    if(result.errors){
      return result
    }
    result.body = !!result.body.removePermission;
    return result
  }
  // --- ¡AÑADIR ESTE NUEVO MÉTODO! ---
  async findPermissionByName(
    name: string,
    correlationId: string,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Permission Orchestrator] Iniciando orquestación para obtener permiso por nombre: ${name}.`,
    );
    const result = await this.sendGraphqlRequest(
      correlationId,
      FIND_PERMISSION_BY_NAME_QUERY, // Usar la nueva query
      { name: name },
      authorizationHeader,
      'obtener permiso por nombre',
    );
    if (result.errors) {
      return result;
    }
    result.body = result.body.findPermissionByName as Permission; // Ajustar la ruta de acceso al body
    return result;
  }


}

  

