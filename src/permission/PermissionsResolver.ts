import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { HttpException, Logger, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsOrchestrator } from 'src/orchestrators/permission/permissions.osrchestrator';
import { CreatePermissionInput } from 'src/permission/dto/create-permission.input';
import { Permission } from 'src/common/interfaces/permissions.interface';
import { PaginationInput } from 'src/common/dto/pagination.input';
import { PaginatedPermissions } from 'src/common/models/paginated-permissions.model';
import { UpdatePermissionInput } from './dto/update-permission.input';


@Resolver()
@UseGuards(JwtAuthGuard)
export class PermissionsResolver {
  private readonly logger = new Logger(PermissionsResolver.name);

  constructor(
    private readonly permissionOrchestrator: PermissionsOrchestrator,
  ) {}

  //mutacion para crear permisos
  @Mutation(() => Permission)
  async createPermission(
    @Args('createPermissionInput') createPermissionInput: CreatePermissionInput,
    @Context() context: any,
  ): Promise<Permission> {
    const req = context.req;
    const correlationId =
      (req as any).id ||
      `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(
      `[${correlationId}] Recibida mutación GraphQL para crear permiso.`,
    );
    this.logger.debug(
      `[${correlationId}] Argumento 'createPermissionInput' recibido: ${JSON.stringify(createPermissionInput)}`,
    );

    const orchestratorResult =
      await this.permissionOrchestrator.createPermission(
        createPermissionInput,
        correlationId,
        authorizationHeader,
      );
    if (orchestratorResult.errors) {
      const errorMessage =
        orchestratorResult.message || 'Ocurrió un error inesperado.';
      throw new HttpException(
        errorMessage,
        orchestratorResult.statusCode || 500,
      );
    }
    return orchestratorResult.body as Permission;
  }

  @Query(() => PaginatedPermissions)
  async findAllPermissions(
    @Args('paginationInput', { type: () => PaginationInput, nullable: true })
    paginationInput: PaginationInput,
    @Context() context: any,
  ): Promise<PaginatedPermissions> {
    const req = context.req,
      correlationId =
        (req as any).id ||
        `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      authorizationHeader = req.headers.authorization;

    this.logger.log(
      `[${correlationId}] Recibida query GraphQL para obtener permisos paginados.`,
    );

    const orchestratorResult =
      await this.permissionOrchestrator.findAllPermissions(
        correlationId,
        paginationInput || {},
        authorizationHeader,
      );

    if (orchestratorResult.errors) {
      const errorMessage =
        orchestratorResult.message || 'Ocurrio un error inesperado.';
      throw new HttpException(
        errorMessage,
        orchestratorResult.statusCode || 500,
      );
    }

    return orchestratorResult.body as PaginatedPermissions;
  }

  @Mutation(() => Permission)
  async updatePermission(
    @Args('id', { type: () => ID }) id: string,
    @Args('updatePermissionInput') updatePermissionInput: UpdatePermissionInput,
    @Context() context: any,
  ): Promise<Permission> {
    const req = context.req;
    const correlationId =
      (req as any).id ||
      `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;
    this.logger.log(
      `[${correlationId}] Recibida mutación GraphQL para actualizar permiso con ID: ${id}.`,
    );
    this.logger.debug(
      `[${correlationId}] Argumento 'id' recibido: ${id} (Tipo: ${typeof id})`,
    );
    this.logger.debug(
      `[${correlationId}] Argumento 'updatePermissionInput' recibido: ${JSON.stringify(
        updatePermissionInput,
      )}`,
    );
    const orchestratorResult =
      await this.permissionOrchestrator.updatePermission(
        id,
        updatePermissionInput,
        correlationId,
        authorizationHeader,
      );
    if (orchestratorResult.errors) {
      const errorMessage =
        orchestratorResult.message || 'Ocurrio un error inesperado.';
      throw new HttpException(
        errorMessage,
        orchestratorResult.statusCode || 500,
      );
    }
    return orchestratorResult.body as Permission;
  }

  @Mutation(() => Boolean, { name: 'removePermission', description: 'Elimina un permiso necesitar tener permiso de admin' })
  async removePermission(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any,
  ): Promise<boolean> {
    const req=context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para eliminar permiso con ID: ${id}.`);
    this.logger.debug(`[${correlationId}] Argumento 'id' recibido: ${id} (Tipo: ${typeof id})`);

    // Delega la lógica de negocio al Orchestrator
    const orchestratorResult = await this.permissionOrchestrator.removePermission(
      id,
      correlationId,
      authorizationHeader,
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrio un error inesperado.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    // El orchestrator devuelve un boolean (true si se eliminó)
    return orchestratorResult.body as boolean;
  }
  
  // --- ¡AÑADIR ESTA NUEVA QUERY! ---
  @Query(() => Permission, { name: 'findPermissionByName', description: 'Obtiene un permiso por su nombre (requiere permiso de vista de permisos).' })
  async findPermissionByName(
    @Args('name', { type: () => String }) name: string,
    @Context() context: any,
  ): Promise<Permission> {
    const req = context.req;
    const correlationId =
      (req as any).id ||
      `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(`[${correlationId}] Recibida query GraphQL para obtener permiso por nombre: ${name}.`);
    this.logger.debug(`[${correlationId}] Argumento 'name' recibido: ${name} (Tipo: ${typeof name})`);

    const orchestratorResult = await this.permissionOrchestrator.findPermissionByName( // Llama al nuevo método en el orquestador
      name,
      correlationId,
      authorizationHeader,
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    return orchestratorResult.body as Permission;
  }
  
}
