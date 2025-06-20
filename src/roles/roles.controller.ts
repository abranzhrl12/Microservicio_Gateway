// src/roles/roles.controller.ts (EN TU API GATEWAY - COMPLETO Y CORREGIDO)

import { Controller, Post, Body, Req, Res, Logger, UseGuards, HttpStatus, Get, Query, Patch, Param } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { RoleOrchestrator } from 'src/orchestrators/role/role.orchestrator';
import { CreateRoleInput, UpdateRoleInput } from 'src/common/interfaces/role.interface'; // Ajusta esta ruta si es diferente
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'; // Ajusta esta ruta si es diferente
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface'; // Asegúrate de que esta ruta es correcta
import { PaginationInput } from 'src/common/dto/pagination.input';

// Define la interfaz del cuerpo de la petición que espera el controlador
interface GraphqlCreateRoleBody {
  query: string;
  variables: {
    createRoleInput: CreateRoleInput;
  };
}
interface GraphqlUpdateRoleBody {
  query?: string; // Opcional para las mutaciones REST-like
  variables: {
    updateRoleInput: UpdateRoleInput;
  };
}

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  private readonly logger = new Logger(RolesController.name);

  constructor(private readonly roleOrchestrator: RoleOrchestrator) {}

  /**
   * Método auxiliar para manejar las respuestas del orquestador de manera consistente.
   */
  private async handleOrchestratorResponse(
    orchestratorPromise: Promise<OrchestratorResult>,
    res: FastifyReply,
    correlationId: string,
    operationName: string, // Ej: "crear rol", "obtener roles"
  ) {
    try {
      const orchestratorResult: OrchestratorResult = await orchestratorPromise;

      if (orchestratorResult.errors && orchestratorResult.errors.length > 0) {
        this.logger.error(
          `[${correlationId}] Errores del Auth Service (vía Orchestrator) al ${operationName}: ${JSON.stringify(orchestratorResult.errors)}`,
        );
        return res.status(orchestratorResult.statusCode || HttpStatus.BAD_REQUEST).send({
          message: orchestratorResult.message || `Error al ${operationName} en el servicio de Autenticación.`,
          errors: orchestratorResult.errors,
        });
      }

      this.logger.log(`[${correlationId}] ${operationName} exitosamente y respuesta enviada.`);
      return res.status(orchestratorResult.statusCode || HttpStatus.OK).send(orchestratorResult.body);

    } catch (error: any) {
      this.logger.error(
        `[${correlationId}] Error inesperado en el controlador de roles durante ${operationName}: ${error.message}`,
        error.stack,
      );

      const statusCode = error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = error.message || `Error interno del Gateway al procesar la solicitud de ${operationName}.`;
      const errorsArray = error.errors || [{ message: 'Error desconocido en el controlador.' }];

      return res.status(statusCode).send({
        message: errorMessage,
        errors: errorsArray,
      });
    }
  }


  @Post('create')
  async createRole(@Body() rawBody: GraphqlCreateRoleBody, @Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const correlationId = (req as any).id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`[${correlationId}] Recibida solicitud para crear rol en /roles/create.`);

    const createRoleInput = rawBody?.variables?.createRoleInput;

    if (!createRoleInput || !createRoleInput.name) {
      this.logger.error(`[${correlationId}] Payload inválido para crear rol. Faltan datos (name en createRoleInput).`);
      return res.status(HttpStatus.BAD_REQUEST).send({
        message: 'Cuerpo de solicitud inválido. Se esperaban los campos "name" para el rol.',
        errors: [{ message: 'Formato esperado: { "variables": { "createRoleInput": { "name": "...", "description": "..." } } }' }],
      });
    }

    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      this.logger.warn(`[${correlationId}] No se encontró el encabezado Authorization en la solicitud del Gateway. Esto podría causar fallos en el microservicio de autenticación.`);
    }

    // Usar el método auxiliar para la lógica del orquestador y la respuesta
    return this.handleOrchestratorResponse(
      this.roleOrchestrator.createRole(createRoleInput, correlationId, authorizationHeader),
      res,
      correlationId,
      'crear rol',
    );
  }

  @Get('all')
  async findAllRoles(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const correlationId = (req as any).id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`[${correlationId}] Recibida solicitud para obtener todos los roles en /roles/all.`);

    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      this.logger.warn(`[${correlationId}] No se encontró el encabezado Authorization en la solicitud del Gateway. Esto podría causar fallos en el microservicio de autenticación.`);
    }

    const paginationInput: PaginationInput = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    if (paginationInput.page !== undefined && (isNaN(paginationInput.page) || paginationInput.page < 1)) {
        this.logger.error(`[${correlationId}] Parámetro 'page' inválido: ${page}`);
        return res.status(HttpStatus.BAD_REQUEST).send({
            message: 'El parámetro "page" debe ser un número entero positivo.',
            errors: [{ message: `Valor inválido para 'page': ${page}` }],
        });
    }
    if (paginationInput.limit !== undefined && (isNaN(paginationInput.limit) || paginationInput.limit < 1)) {
        this.logger.error(`[${correlationId}] Parámetro 'limit' inválido: ${limit}`);
        return res.status(HttpStatus.BAD_REQUEST).send({
            message: 'El parámetro "limit" debe ser un número entero positivo.',
            errors: [{ message: `Valor inválido para 'limit': ${limit}` }],
        });
    }

    // Usar el método auxiliar para la lógica del orquestador y la respuesta
    return this.handleOrchestratorResponse(
      this.roleOrchestrator.findAllRoles(correlationId, paginationInput, authorizationHeader),
      res,
      correlationId,
      'obtener roles',
    );
  }
  @Patch(':id') // La ':id' en la ruta indica un parámetro de URL
  async updateRole(
    @Param('id') id: string, // Captura el ID de la URL
    @Body() rawBody: GraphqlUpdateRoleBody,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const correlationId = (req as any).id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`[${correlationId}] Recibida solicitud para actualizar rol con ID: ${id} en /roles/${id}.`);

    const updateRoleInput = rawBody?.variables?.updateRoleInput;

    // Validación básica: al menos un campo debe existir en updateRoleInput
    if (!updateRoleInput || (!updateRoleInput.name && !updateRoleInput.description)) {
      this.logger.error(`[${correlationId}] Payload inválido para actualizar rol. Se espera al menos 'name' o 'description'.`);
      return res.status(HttpStatus.BAD_REQUEST).send({
        message: 'Cuerpo de solicitud inválido. Se espera al menos el campo "name" o "description" en "updateRoleInput".',
        errors: [{ message: 'Formato esperado: { "variables": { "updateRoleInput": { "name"?: "...", "description"?: "..." } } }' }],
      });
    }

    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      this.logger.warn(`[${correlationId}] No se encontró el encabezado Authorization en la solicitud del Gateway. Esto podría causar fallos en el microservicio de autenticación.`);
    }

    return this.handleOrchestratorResponse(
      this.roleOrchestrator.updateRole(id, updateRoleInput, correlationId, authorizationHeader),
      res,
      correlationId,
      `actualizar rol con ID ${id}`,
    );
  }
}