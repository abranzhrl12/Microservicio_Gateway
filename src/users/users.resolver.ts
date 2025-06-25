import { HttpException, Logger, UseGuards, UnauthorizedException } from '@nestjs/common'; // Añade UnauthorizedException
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from 'src/common/interfaces/users.interface';
import { UsersOrchestrator } from '../orchestrators/users/users.orchestrator';
import { PaginationInput } from 'src/common/dto/pagination.input';
import { PaginatedUsers } from 'src/common/models/paginated-users.model';


import { FilesService } from 'src/files/files.service';
import { AuthenticatedUser } from 'src/common/interfaces/authenticated-user.interface'; // <-- Asegúrate de importar esto
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UpdateUserStatusInput } from './dto/update-user-status.input';
import { UsersPaginationInput } from './dto/users-pagination.input';

@Resolver(() => User)
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  private readonly logger = new Logger(UsersResolver.name);

  constructor(
    private readonly usersOrchestrator: UsersOrchestrator,
    private readonly filesService: FilesService,
  ) {}

  @Mutation(() => User)
  async createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
    @Context() context,
  ): Promise<User> {
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para crear usuario.`);
    this.logger.debug(`[${correlationId}] Argumento 'createUserInput' recibido: ${JSON.stringify(createUserInput)}`);

    // Obtener el usuario autenticado del contexto de la petición
    const authenticatedUser: AuthenticatedUser = req.user;
    if (!authenticatedUser || !authenticatedUser.token) {
        this.logger.error(`[${correlationId}] [UsersResolver] No se encontró usuario autenticado o token en el contexto para crear usuario.`);
        throw new UnauthorizedException('No autenticado: Token de autorización ausente o inválido.');
    }

    const orchestratorResult = await this.usersOrchestrator.createUser(
      createUserInput,
      correlationId,
      authenticatedUser.token, // <-- Pasar el token explícitamente
    );
    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado al crear el usuario.';
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
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`[${correlationId}] Recibida query GraphQL para obtener todos los usuarios paginados.`);

    // Obtener el usuario autenticado del contexto de la petición
    const authenticatedUser: AuthenticatedUser = req.user;
    this.logger.debug(`[${correlationId}] [UsersResolver] authenticatedUser en Context: ${JSON.stringify(authenticatedUser)}`);

    if (!authenticatedUser || !authenticatedUser.token) {
        this.logger.error(`[${correlationId}] [UsersResolver] No se encontró usuario autenticado o token en el contexto para obtener usuarios paginados.`);
        throw new UnauthorizedException('No autenticado: Token de autorización ausente o inválido.');
    }

    const orchestratorResult = await this.usersOrchestrator.findAllUsers(
      correlationId,
      paginationInput || {},
      authenticatedUser.token, // <-- Pasar el token explícitamente
    );
    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }
    return orchestratorResult.body as PaginatedUsers;
  }

  @Mutation(() => User, { name: 'updateUser', description: 'Actualiza los datos de un usuario por su ID (requiere permiso para gestionar usuarios).' })
  async updateUser(
    @Args('id', { type: () => ID }) id: number,
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @Context() context
  ): Promise<User> {
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para actualizar usuario con ID: ${id}.`);
    this.logger.debug(`[${correlationId}] Argumento 'updateUserInput' recibido: ${JSON.stringify(updateUserInput)}`);

    // Obtener el usuario autenticado del contexto de la petición
    const authenticatedUser: AuthenticatedUser = req.user;
    if (!authenticatedUser || !authenticatedUser.token) {
        this.logger.error(`[${correlationId}] [UsersResolver] No se encontró usuario autenticado o token en el contexto para actualizar usuario.`);
        throw new UnauthorizedException('No autenticado: Token de autorización ausente o inválido.');
    }

    let newAvatarUrl: string | undefined;
    let newAvatarPublicId: string | undefined;

    if (updateUserInput.avatarFile) {
      this.logger.log(`[${correlationId}] Se ha detectado un nuevo avatar en la solicitud para el usuario ID: ${id}.`);
      try {
        const { createReadStream, filename, mimetype } = await updateUserInput.avatarFile;
        const fileStream = createReadStream();

        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of fileStream) {
          chunks.push(chunk);
          size += chunk.length;
        }
        const fileBuffer = Buffer.concat(chunks);

        const uploadResult = await this.filesService.uploadFile(
          {
            buffer: fileBuffer,
            fileName: filename,
            mimetype: mimetype,
            size: size,
            folder: `avatars/${id}`,
            entityId: id.toString(),
          },
          authenticatedUser // Pasa el usuario autenticado al FilesService
        );

        newAvatarUrl = uploadResult.url;
        newAvatarPublicId = uploadResult.publicId;

        this.logger.log(`[${correlationId}] Avatar subido exitosamente. URL: ${newAvatarUrl}, PublicId: ${newAvatarPublicId}`);

      } catch (error) {
        this.logger.error(`[${correlationId}] Error al subir el avatar para el usuario ID: ${id}. ${error.message}`, (error as Error).stack);
        throw new HttpException(`Fallo al subir el avatar: ${error.message}`, 500);
      }
    }

    const finalUpdateUserInput: UpdateUserInput = { ...updateUserInput };
    if (newAvatarUrl !== undefined) {
      finalUpdateUserInput.avatarUrl = newAvatarUrl;
      finalUpdateUserInput.avatarPublicId = newAvatarPublicId;
    }
    if (finalUpdateUserInput.avatarFile) {
      delete finalUpdateUserInput.avatarFile;
    }

    const orchestratorResult = await this.usersOrchestrator.updateUser(
      correlationId,
      id,
      finalUpdateUserInput,
      authenticatedUser.token, // <-- Pasar el token explícitamente
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    return orchestratorResult.body as User;
  }

  @Mutation(() => User, { name: 'updateUserStatus', description: 'Actualiza el estado activo/inactivo de un usuario (requiere permiso para gestionar estados de usuario).' })
  async updateUserStatus(
    @Args('id', { type: () => ID }) id: number,
    @Args('updateUserStatusInput') updateUserStatusInput: UpdateUserStatusInput,
    @Context() context
  ): Promise<User> {
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Obtener el usuario autenticado del contexto de la petición
    const authenticatedUser: AuthenticatedUser = req.user;
    if (!authenticatedUser || !authenticatedUser.token) {
        this.logger.error(`[${correlationId}] [UsersResolver] No se encontró usuario autenticado o token en el contexto para actualizar estado de usuario.`);
        throw new UnauthorizedException('No autenticado: Token de autorización ausente o inválido.');
    }

    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para actualizar estado de usuario con ID: ${id} a ${updateUserStatusInput.isActive}.`);

    const orchestratorResult = await this.usersOrchestrator.updateUserStatus(
      correlationId,
      id,
      updateUserStatusInput,
      authenticatedUser.token, // <-- Pasar el token explícitamente
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado al actualizar el estado del usuario.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    return orchestratorResult.body as User;
  }

  @Query(() => PaginatedUsers, { name: 'searchUsers', description: 'Busca y filtra usuarios con paginación.' })
  async searchUsers(
    @Args('paginationInput', { type: () => UsersPaginationInput, nullable: true })
    paginationInput: UsersPaginationInput,
    @Context() context
  ): Promise<PaginatedUsers> {
    const req = context.req;
    const correlationId = (req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Obtener el usuario autenticado del contexto de la petición
    const authenticatedUser: AuthenticatedUser = req.user;
    if (!authenticatedUser || !authenticatedUser.token) {
        this.logger.error(`[${correlationId}] [UsersResolver] No se encontró usuario autenticado o token en el contexto para buscar usuarios.`);
        throw new UnauthorizedException('No autenticado: Token de autorización ausente o inválido.');
    }

    this.logger.log(`[${correlationId}] Recibida query GraphQL para buscar usuarios con filtros: ${JSON.stringify(paginationInput)}`);

    const orchestratorResult = await this.usersOrchestrator.searchUsers(
      correlationId,
      paginationInput || {},
      authenticatedUser.token, // <-- Pasar el token explícitamente
    );

    if (orchestratorResult.errors) {
      const errorMessage = orchestratorResult.message || 'Ocurrió un error inesperado al buscar usuarios.';
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

    return orchestratorResult.body as PaginatedUsers;
  }
}