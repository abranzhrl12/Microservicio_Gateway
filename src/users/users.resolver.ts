import { HttpException, Logger, UseGuards } from '@nestjs/common';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from 'src/common/interfaces/users.interface';
import { CreateUserInput } from './dto/create-user.input';
import { UsersOrchestrator } from '../orchestrators/users/users.orchestrator';
import { PaginationInput } from 'src/common/dto/pagination.input';
import { PaginatedUsers } from 'src/common/models/paginated-users.model';
import { UpdateUserInput } from './dto/update-user.input';
import { UpdateUserStatusInput } from './dto/update-user-status.input';
import { UsersPaginationInput } from './dto/users-pagination.input';


@Resolver(() => User)
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  private readonly logger = new Logger(UsersResolver.name);

  constructor(private readonly usersOrchestrator: UsersOrchestrator) {}

  @Mutation(() => User)
  async createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @Context() context,
  ): Promise<User> {
    const req = context.req;
    const correlationId =
      (req as any).id ||
      `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;
    this.logger.log(
      `[${correlationId}] Recibida mutación GraphQL para crear usuario.`,
    );
    this.logger.debug(
      `[${correlationId}] Argumento 'createUserInput' recibido: ${JSON.stringify(createUserInput)}`,
    );
    this.logger.debug(
      `[${correlationId}] Argumento 'authorizationHeader' recibido: ${JSON.stringify(authorizationHeader)}`,
    );

    const orchestratorResult = await this.usersOrchestrator.createUser(
      createUserInput,
      correlationId,
      authorizationHeader,
    );
    if(orchestratorResult.errors){
        const errorMessage = orchestratorResult.message || 'Ocurrio un error inesperado al crear el usuario.';
        throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);

    }
     return orchestratorResult.body as User;
  
  }
  @Query(() => PaginatedUsers)
  async findAllUsers(
    @Args('paginationInput', { type: () => PaginationInput, nullable: true })
    paginationInput: PaginationInput,
    @Context() context
  ): Promise<PaginatedUsers> {
    const req=context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    autorizationHeader = req.headers.authorization;
    this.logger.log(`[${correlationId}] Recibida query GraphQL para obtener todos los usuarios paginados.`);
    const orchestratorResult= await this.usersOrchestrator.findAllUsers(
      correlationId,
      paginationInput || {},
      autorizationHeader
    );
    if(orchestratorResult.errors){
      const errorMessage = orchestratorResult.message || 'Ocurrio un error inesperado.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }
   return orchestratorResult.body as PaginatedUsers;
  }

   @Mutation(() => User, { name: 'updateUser', description: 'Actualiza los datos de un usuario por su ID (requiere permiso para gestionar usuarios).' })
  // @HasPermission('manage_users') // <-- Añade el permiso adecuado para esta operación
  async updateUser(
    @Args('id', { type: () => ID }) id: number, // El ID del usuario a actualizar
    @Args('updateUserInput') updateUserInput: UpdateUserInput, // Los datos a actualizar
    @Context() context // Para obtener el correlationId y el token
  ): Promise<User> {
    const req=context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`; 
    const authorizationHeader = req.headers.authorization;
    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para actualizar usuario con ID: ${id}.`); 
    this.logger.debug(`[${correlationId}] Argumento 'updateUserInput' recibido: ${JSON.stringify(updateUserInput)}`); 
    this.logger.debug(`[${correlationId}] Argumento 'authorizationHeader' recibido: ${JSON.stringify(authorizationHeader)}`); 
    const orchestratorResult = await this.usersOrchestrator.updateUser( // Llama al nuevo método en el orquestador
      id,
      updateUserInput,
      correlationId,
      authorizationHeader
    );
    if(orchestratorResult.errors){
      const errorMessage = orchestratorResult.message || 'Ocurrio un error inesperado.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }
   
    return orchestratorResult.body as User;
  }


    @Mutation(() => User, { name: 'updateUserStatus', description: 'Actualiza el estado activo/inactivo de un usuario (requiere permiso para gestionar estados de usuario).' })
  async updateUserStatus(
    @Args('id', { type: () => ID }) id: number,
    @Args('updateUserStatusInput') updateUserStatusInput: UpdateUserStatusInput,
    @Context() context // Para obtener el correlationId y el token
  ): Promise<User> {
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para actualizar estado de usuario con ID: ${id} a ${updateUserStatusInput.isActive}.`);

    const orchestratorResult = await this.usersOrchestrator.updateUserStatus(
      correlationId,
      id,
      updateUserStatusInput,
      authorizationHeader
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado al actualizar el estado del usuario.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    return orchestratorResult.body as User;
  }

   @Query(() => PaginatedUsers, { name: 'searchUsers', description: 'Busca y filtra usuarios con paginación.' })
  // @HasPermission('view_users') // <-- Añade este decorador si lo has comentado
  async searchUsers(
    // ¡¡¡CAMBIA ESTA LÍNEA COMPLETAMENTE!!!
    @Args('paginationInput', { type: () => UsersPaginationInput, nullable: true }) 
    paginationInput: UsersPaginationInput, 
    @Context() context
  ): Promise<PaginatedUsers> { // <-- Correcto: El tipo de retorno sigue siendo PaginatedUsers
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const authorizationHeader = req.headers.authorization;

    this.logger.log(`[${correlationId}] Recibida query GraphQL para buscar usuarios con filtros: ${JSON.stringify(paginationInput)}`);

    const orchestratorResult = await this.usersOrchestrator.searchUsers(
      correlationId,
      paginationInput || {},
      authorizationHeader
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado al buscar usuarios.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    return orchestratorResult.body as PaginatedUsers;
  }
}
