// src/orchestrators/role/role.orchestrator.ts (EN TU API GATEWAY - CORREGIDO)

import { Injectable, Inject, Logger, HttpStatus } from '@nestjs/common';

import { CreateRoleInput, UpdateRoleInput } from 'src/common/interfaces/role.interface';
import { createRoleMutation, findAllRolesQuery,updateRoleMutation } from 'src/graphql-queries';
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface';
import { tryCatch } from 'graphql-request/build/lib/prelude';
import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { PaginationInput } from 'src/common/dto/pagination.input';

@Injectable()
export class RoleOrchestrator {
  private readonly logger = new Logger(RoleOrchestrator.name);

  constructor(
    @Inject('NATS_SERVICE') private authServiceClient: ClientProxy, // <--- ¡CAMBIA 'AUTH_SERVICE' A 'NATS_SERVICE' AQUÍ!
  ) {}

   private async sendGraphqlRequest(
    correlationId: string,
    query: string,
    variables: any, // Los variables específicos de la query
    authorizationHeader?: string,
    operationName: string = 'GraphQL Operation', // Nombre para el log
  ): Promise<OrchestratorResult> {
    this.logger.log(
      `[${correlationId}] [Role Orchestrator] Enviando solicitud a Auth Service para ${operationName} vía NATS.`,
    );

    const headersToSend: { [key: string]: string } = {
      'X-Correlation-ID': correlationId,
    };

    if (authorizationHeader) {
      headersToSend['Authorization'] = authorizationHeader;
      this.logger.debug(
        `[${correlationId}] [Role Orchestrator] Incluyendo Authorization header en mensaje NATS para Auth Service (${operationName}).`,
      );
    } else {
      this.logger.warn(
        `[${correlationId}] [Role Orchestrator] No se detectó Authorization header para reenviar al Auth Service (${operationName}).`,
      );
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
        ),
      );

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
      return {
        statusCode: HttpStatus.OK,
        body: response.data, // Por defecto, se asume que la data está directamente aquí
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

    // Si hubo un error en la capa genérica, lo devolvemos directamente
    if (result.errors) {
      return result;
    }

    // Acceder a la data específica de la mutación si es necesario (ej. result.body.createRole)
    // El sendGraphqlRequest devuelve response.data, que contiene createRole
    result.body = result.body.createRole; // Ajustar el body para devolver directamente el objeto Role

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

    // Si hubo un error en la capa genérica, lo devolvemos directamente
    if (result.errors) {
      return result;
    }

    // Acceder a la data específica de la query (response.data.findAllRoles)
    result.body = result.body.findAllRoles; // Ajustar el body para devolver directamente la estructura paginada

    return result;
  }

  async updateRole(
    id: string, // El ID del rol a actualizar
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
      { id: id, updateRoleInput: updateRoleInput }, // Pasar id y updateRoleInput como variables
      authorizationHeader,
      'actualizar rol',
    );

    if (result.errors) {
      return result;
    }

    result.body = result.body.updateRole; // Acceder a la data específica de la mutación
    return result;
  }
}
