// src/auth/auth.resolver.ts (en el GATEWAY)
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql'; // NestJS GraphQL decorator
import { Public } from 'src/common/decorators/public.decorator';
import { LoginOrchestrator } from 'src/orchestrators/login/login.orchestrator';
import { Logger, HttpStatus, HttpException, BadRequestException, UnauthorizedException } from '@nestjs/common'; // Importa excepciones HTTP
import { v4 as uuidv4 } from 'uuid';
import { AuthResponse } from './models/auth-response.model';
import { LoginInputDto } from './dto/login-input.dto';
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface';
import { FastifyReply } from 'fastify/types/reply'; // Asegúrate de que esta importación sea correcta para tu versión de Fastify

@Resolver()
export class AuthResolver {
  private readonly logger = new Logger(AuthResolver.name);

  constructor(private readonly loginOrchestrator: LoginOrchestrator) {}

  @Mutation(() => AuthResponse, { name: 'loginUser' })
  @Public()
  async login(
    @Args('loginInput') loginInput: LoginInputDto,
    @Context() context: { reply: FastifyReply } // <-- ¡Inyecta el contexto de Fastify aquí!
  ): Promise<AuthResponse> {
    const correlationId = uuidv4();
    this.logger.log(`[${correlationId}] [AuthResolver Gateway] Recibida mutación loginUser.`);
    this.logger.debug(`[${correlationId}] LoginInput: ${JSON.stringify(loginInput)}`);

    try {
      const orchestratorResult: OrchestratorResult<AuthResponse> = await this.loginOrchestrator.orchestrateLogin(
        loginInput,
        correlationId,
      );

      // Manejo de errores desde el orquestador
      if (orchestratorResult.errors && orchestratorResult.errors.length > 0) {
        this.logger.error(
          `[${correlationId}] Errores del Orquestador de Login: ${JSON.stringify(orchestratorResult.errors)}`
        );

        const errorMessage = orchestratorResult.message || 'Error en el login.';
        const errorStatusCode = orchestratorResult.statusCode || HttpStatus.BAD_REQUEST;

        if (errorStatusCode === HttpStatus.UNAUTHORIZED) {
          throw new UnauthorizedException(errorMessage, { cause: orchestratorResult.errors });
        } else if (errorStatusCode === HttpStatus.BAD_REQUEST) {
          throw new BadRequestException(errorMessage, { cause: orchestratorResult.errors });
        } else {
          throw new HttpException(
            errorMessage,
            errorStatusCode,
            { cause: orchestratorResult.errors }
          );
        }
      }

      // Si no hay errores y hay un cuerpo de respuesta
      if (orchestratorResult.body) {
        const { accessToken, refreshToken, user, menuItems } = orchestratorResult.body;

        // --- INICIO DE DEPURACIÓN DE COOKIE ---
        const cookieName = 'access_token';
        const cookieValue = accessToken;
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          expires: new Date(Date.now() + 3600000),
          sameSite: 'lax' as const, // 'lax' o 'strict'
          path: '/',
        };

        this.logger.debug(`[${correlationId}] [AuthResolver] Preparando para establecer cookie:`);
        this.logger.debug(`[${correlationId}]   Nombre: ${cookieName}`);
        this.logger.debug(`[${correlationId}]   Valor (primeros 10 chars): ${cookieValue ? cookieValue.substring(0, 10) + '...' : 'N/A'}`);
        this.logger.debug(`[${correlationId}]   Opciones: ${JSON.stringify(cookieOptions)}`);
        this.logger.debug(`[${correlationId}]   NODE_ENV: ${process.env.NODE_ENV}`);

        try {
          // --- ¡AQUÍ ES DONDE ESTABLECES LAS COOKIES! ---
          context.reply.setCookie(cookieName, cookieValue, cookieOptions);
          this.logger.debug(`[${correlationId}] Access Token establecido como cookie HTTP-Only con nombre '${cookieName}'.`);
        } catch (cookieError) {
          this.logger.error(`[${correlationId}] Error al intentar establecer la cookie: ${cookieError.message}`, cookieError.stack);
          // Si setCookie falla, esto podría ser un indicativo de que el plugin de Fastify no está registrado o hay un problema con 'reply'
        }
        // --- FIN DE DEPURACIÓN DE COOKIE ---

        // --- Retorna el Refresh Token en el payload GraphQL (para localStorage del frontend) ---
        // Y el resto de la información del usuario y menú
        return {
          accessToken: 'HIDDEN_IN_HTTP_ONLY_COOKIE', // Un placeholder para indicar que está en cookie
          refreshToken: refreshToken, // Este sí se envía para que el frontend lo guarde en localStorage
          user: user,
          menuItems: menuItems,
        };
      } else {
        this.logger.error(`[${correlationId}] Orquestador devolvió un resultado sin body y sin errores explícitos.`);
        throw new HttpException('Respuesta inesperada del servidor.', HttpStatus.INTERNAL_SERVER_ERROR);
      }

    } catch (error: any) {
      this.logger.error(`[${correlationId}] Error inesperado en el resolver de login: ${error.message}`, error.stack);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error interno del Gateway durante el login.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}