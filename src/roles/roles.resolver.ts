// src/roles/roles.resolver.ts (EN TU API GATEWAY)

import { Resolver, Query, Mutation, Args, Context, ID } from '@nestjs/graphql';
import { HttpException, Logger, UseGuards } from '@nestjs/common';
import { RoleOrchestrator } from 'src/orchestrators/role/role.orchestrator';

import { PaginationInput } from 'src/common/dto/pagination.input';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginatedRoles } from 'src/common/interfaces/paginated-roles.interface';
import { Role } from 'src/common/interfaces/role.interface';
import { CreateRoleInput } from 'src/roles/dto/create-role.input';
import { UpdateRoleInput } from 'src/roles/dto/update-role.input';
import { updateRoleMutation } from 'src/graphql-queries';
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface';
import { transformDates } from 'src/common/utils/date.utils';
import { AssignPermissionsToRoleInput } from 'src/permission/dto/assign-permissions-to-role.input';

@Resolver(() => Role) // Indica que este resolver es para el tipo GraphQL 'Role'
@UseGuards(JwtAuthGuard) // Aplica la guardia a todas las operaciones de este resolver
export class RolesResolver {
  private readonly logger = new Logger(RolesResolver.name);

  constructor(private readonly roleOrchestrator: RoleOrchestrator) {}

   @Mutation(() => Role)
  async createRole(
    @Args('createRoleInput') createRoleInput: CreateRoleInput,
    @Context() context: any,
  ): Promise<Role> {
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para crear rol.`);
    this.logger.debug(`[${correlationId}] Argumento 'createRoleInput' recibido: ${JSON.stringify(createRoleInput)}`);


    const orchestratorResult = await this.roleOrchestrator.createRole(
      createRoleInput,
      correlationId,
      authorizationHeader,
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    return orchestratorResult.body as Role;
  }

  @Query(() => PaginatedRoles)
  async findAllRoles(
    @Args('paginationInput', { type: () => PaginationInput, nullable: true }) paginationInput: PaginationInput,
    @Context() context: any,
  ): Promise<PaginatedRoles> {
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(`[${correlationId}] Recibida query GraphQL para obtener roles paginados.`);

    const orchestratorResult = await this.roleOrchestrator.findAllRoles(
      correlationId,
      paginationInput || {},
      authorizationHeader,
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    return orchestratorResult.body as PaginatedRoles;
  }

 @Mutation(() => Role)
  async updateRole(
    @Args('id', { type: () => ID }) id: string, // GraphQL ID argument from client
    @Args('updateRoleInput') updateRoleInput: UpdateRoleInput, // GraphQL InputType argument from client
    @Context() context: any, // Context to get request details
  ): Promise<Role> { // Return type is Role as defined in @Mutation(() => Role)
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para actualizar rol con ID: ${id}.`);
    this.logger.debug(`[${correlationId}] Argumento 'id' recibido: ${id} (Tipo: ${typeof id})`);
    this.logger.debug(`[${correlationId}] Argumento 'updateRoleInput' recibido: ${JSON.stringify(updateRoleInput)}`);
    this.logger.debug(`[${correlationId}] Tipo de 'updateRoleInput': ${updateRoleInput.constructor.name}`);

    // DELEGATE TO THE ORCHESTRATOR
    const orchestratorResult = await this.roleOrchestrator.updateRole(
      id,
      updateRoleInput,
      correlationId,
      authorizationHeader,
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    // The orchestrator's body will be the 'Role' object from the microservice
    return orchestratorResult.body as Role;
  }

  @Mutation(() => Boolean, { name: 'removeRole', description: 'Elimina un rol (requiere permiso para eliminar roles).' })
  async removeRole(
    @Args('id', { type: () => ID }) id: string, // ¡Importante: ID en GraphQL es string!
    @Context() context: any,
  ): Promise<boolean> {
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para eliminar rol con ID: ${id}.`);
    this.logger.debug(`[${correlationId}] Argumento 'id' recibido: ${id} (Tipo: ${typeof id})`);

    // Delega la lógica de negocio al Orchestrator
    const orchestratorResult = await this.roleOrchestrator.removeRole(
      id,
      correlationId,
      authorizationHeader,
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado al eliminar el rol.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    // El orchestrator devuelve un boolean (true si se eliminó)
    return orchestratorResult.body as boolean;
  }

  // *** NUEVA QUERY findRoleById ***
  @Query(() => Role, { name: 'findRoleById', description: 'Obtiene un rol por su ID.' })

  async findRoleById(
    @Args('id', { type: () => ID }) id: string, // ¡Importante: ID en GraphQL es string!
    @Context() context: any,
  ): Promise<Role> {
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(`[${correlationId}] Recibida query GraphQL para obtener rol con ID: ${id}.`);
    this.logger.debug(`[${correlationId}] Argumento 'id' recibido: ${id} (Tipo: ${typeof id})`);

    // Delega la lógica de negocio al Orchestrator
    const orchestratorResult = await this.roleOrchestrator.findRoleById(
      id,
      correlationId,
      authorizationHeader,
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado al buscar el rol por ID.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    // El body del resultado del orchestrator será directamente el objeto Role
    return orchestratorResult.body as Role;
  }

   @Mutation(() => Role, {
    name: 'assignPermissionsToRole',
    description: 'Asigna permisos a un rol específico (requiere permiso de gestión de roles y permisos).',
  })
  // Se asume que 'manage_roles_permissions' es el permiso requerido para esta acción.
  async assignPermissionsToRole(
    @Args('assignPermissionsToRoleInput') input: AssignPermissionsToRoleInput,
    @Context() context: any,
  ): Promise<Role> {
    const req = context.req;
    const correlationId =
      (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(
      `[${correlationId}] Recibida mutación GraphQL para asignar permisos al rol con ID: ${input.roleId}.`,
    );
    this.logger.debug(
      `[${correlationId}] Argumento 'assignPermissionsToRoleInput' recibido: ${JSON.stringify(input)}`,
    );

    // Llama al Orchestrator para manejar la lógica de comunicación con el microservicio de Auth
    const orchestratorResult = await this.roleOrchestrator.assignPermissionsToRole(
      input.roleId,
      input.permissionIds,
      correlationId,
      authorizationHeader,
    );

    if (orchestratorResult.errors && orchestratorResult.errors.length > 0) {
      const errorMessage =
        orchestratorResult.message || 'Ocurrió un error inesperado al asignar permisos.';
      throw new HttpException(
        errorMessage,
        orchestratorResult.statusCode || 500,
      );
    }
    
    // Asegúrate de que el body no sea null/undefined antes de castear
    if (!orchestratorResult.body) {
        this.logger.error(`[${correlationId}] El orquestador de roles no devolvió un cuerpo en la respuesta de asignación de permisos.`);
        throw new HttpException('Respuesta inesperada del orquestador.', 500);
    }

    return orchestratorResult.body as Role;
  }

}