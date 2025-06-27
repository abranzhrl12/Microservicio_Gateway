// src/auth/auth.resolver.ts (en el GATEWAY)

import { Resolver, Mutation, Args, Context, Query } from '@nestjs/graphql'; // Añadimos Query por si hay (o habrá) queries protegidas
import { Public } from 'src/common/decorators/public.decorator';
import { LoginOrchestrator } from 'src/orchestrators/login/login.orchestrator';
import { Logger, HttpStatus, HttpException, BadRequestException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuthResponse } from './models/auth-response.model';
import { LoginInputDto } from './dto/login-input.dto';
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface';
import { FastifyReply } from 'fastify/types/reply'; // Necesario para setCookie

@Resolver()
export class AuthResolver {
  private readonly logger = new Logger(AuthResolver.name);

  constructor(private readonly loginOrchestrator: LoginOrchestrator) {}

  @Mutation(() => AuthResponse, { name: 'loginUser' })
  @Public() // Esta mutación es pública, no requiere autenticación
  async login(
    @Args('loginInput') loginInput: LoginInputDto,
    @Context() context: { reply: FastifyReply } // Inyectamos FastifyReply para la cookie
  ): Promise<AuthResponse> {
    const correlationId = uuidv4();
    this.logger.log(`[${correlationId}] [AuthResolver Gateway] Recibida mutación loginUser.`);
    this.logger.debug(`[${correlationId}] LoginInput: ${JSON.stringify(loginInput)}`);

    try {
      const orchestratorResult: OrchestratorResult<AuthResponse> = await this.loginOrchestrator.orchestrateLogin(
        loginInput,
        correlationId,
      );

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

      if (orchestratorResult.body) {
        const { accessToken, refreshToken, user, menuItems, accessTokenExpiresIn, refreshTokenExpiresIn } = orchestratorResult.body;

        // --- VALIDACIONES DE TOKENS ---
        if (!accessToken) {
            this.logger.error(`[${correlationId}] Access Token es undefined o nulo de la respuesta del orquestador.`);
            throw new HttpException('Access Token no recibido del servicio de autenticación.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!refreshToken) {
            this.logger.error(`[${correlationId}] Refresh Token es undefined o nulo de la respuesta del orquestador.`);
            throw new HttpException('Refresh Token no recibido del servicio de autenticación.', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // --- Establecer el Access Token como cookie HttpOnly (como necesitas) ---
        const accessTokenCookieName = 'access_token';
        const accessTokenCookieOptions = {
          httpOnly: true, // Esto es lo que lo hace HttpOnly
          secure: process.env.NODE_ENV === 'production', // Solo en HTTPS en producción
          expires: new Date(Date.now() + (accessTokenExpiresIn || 3600) * 1000), // Usar expiración real del token
          sameSite: 'lax' as const, // Opciones de SameSite para seguridad CSRF
          path: '/', // La cookie es válida para toda la aplicación
        };
        context.reply.setCookie(accessTokenCookieName, accessToken, accessTokenCookieOptions);
        this.logger.debug(`[${correlationId}] Access Token establecido como cookie HTTP-Only con nombre '${accessTokenCookieName}'.`);

        // --- ¡EL REFRESH TOKEN REAL SE DEVUELVE EN EL PAYLOAD GRAPHQL! ---
        // El frontend lo recibirá y lo guardará en localStorage
        return {
          accessToken: 'HIDDEN_IN_HTTP_ONLY_COOKIE', // El Access Token va en HttpOnly, se devuelve un placeholder
          refreshToken: refreshToken, // <-- ¡El Refresh Token REAL!
          user: user,
          menuItems: menuItems,
          accessTokenExpiresIn: accessTokenExpiresIn, // Tiempos de expiración para el frontend (opcional)
          refreshTokenExpiresIn: refreshTokenExpiresIn, // Tiempos de expiración para el frontend (opcional)
        };
      } else {
        this.logger.error(`[${correlationId}] Orquestador devolvió un resultado sin 'body' o con 'body' vacío, y sin errores explícitos.`);
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

  // --- ¡NUEVA MUTACIÓN PARA REFRESCAR EL TOKEN DESDE EL FRONTEND! ---
  @Mutation(() => AuthResponse, { name: 'refreshToken' })
  @Public() // Esta mutación DEBE ser pública porque se llama cuando el accessToken ya expiró
  async refreshToken(
    @Args('refreshToken') refreshToken: string, // El frontend envía el refreshToken aquí
    @Context() context: { reply: FastifyReply }
  ): Promise<AuthResponse> {
    const correlationId = uuidv4();
    this.logger.log(`[${correlationId}] [AuthResolver Gateway] Recibida mutación refreshToken.`);
    this.logger.debug(`[${correlationId}] RefreshToken recibido (primeros 10 chars): ${refreshToken ? refreshToken.substring(0, 10) + '...' : 'N/A'}`);

    try {
      // Llama al orquestador para que se comunique con el microservicio de autenticación
      const orchestratorResult: OrchestratorResult<AuthResponse> = await this.loginOrchestrator.orchestrateRefresh(
        refreshToken,
        correlationId,
      );

      if (orchestratorResult.errors && orchestratorResult.errors.length > 0) {
        this.logger.error(
          `[${correlationId}] Errores del Orquestador de Refresh: ${JSON.stringify(orchestratorResult.errors)}`
        );
        const errorMessage = orchestratorResult.message || 'Error al refrescar token.';
        const errorStatusCode = orchestratorResult.statusCode || HttpStatus.UNAUTHORIZED;

        throw new HttpException(errorMessage, errorStatusCode, { cause: orchestratorResult.errors });
      }

      if (orchestratorResult.body) {
        const { accessToken, refreshToken: newRefreshToken, user, menuItems, accessTokenExpiresIn, refreshTokenExpiresIn } = orchestratorResult.body;

        // --- VALIDACIONES DE TOKENS ---
        if (!accessToken) {
            this.logger.error(`[${correlationId}] Nuevo Access Token es undefined o nulo de la respuesta del orquestador de refresh.`);
            throw new HttpException('Nuevo Access Token no recibido.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!newRefreshToken) {
            this.logger.error(`[${correlationId}] Nuevo Refresh Token es undefined o nulo de la respuesta del orquestador de refresh.`);
            throw new HttpException('Nuevo Refresh Token no recibido.', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // --- Establecer el NUEVO Access Token como cookie HttpOnly ---
        const accessTokenCookieName = 'access_token';
        const accessTokenCookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          expires: new Date(Date.now() + (accessTokenExpiresIn || 3600) * 1000),
          sameSite: 'lax' as const,
          path: '/',
        };
        context.reply.setCookie(accessTokenCookieName, accessToken, accessTokenCookieOptions);
        this.logger.debug(`[${correlationId}] Nuevo Access Token establecido como cookie HTTP-Only.`);

        // --- ¡El NUEVO Refresh Token REAL se devuelve en el payload GraphQL! ---
        // El frontend lo recibirá y actualizará su localStorage con el token rotado
        return {
          accessToken: 'HIDDEN_IN_HTTP_ONLY_COOKIE', // Access token va en HttpOnly
          refreshToken: newRefreshToken, // <-- ¡El Refresh Token REAL y ROTADO!
          user: user,
          menuItems: menuItems,
          accessTokenExpiresIn: accessTokenExpiresIn,
          refreshTokenExpiresIn: refreshTokenExpiresIn,
        };
      } else {
        this.logger.error(`[${correlationId}] Orquestador de refresh devolvió un resultado sin 'body'.`);
        throw new HttpException('Respuesta inesperada del servicio de refresh.', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } catch (error: any) {
      this.logger.error(`[${correlationId}] Error inesperado en el resolver de refresh: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error interno del Gateway durante el refresh de token.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}