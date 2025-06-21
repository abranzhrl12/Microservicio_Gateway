// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super(); // No es necesario pasar nada al constructor de AuthGuard si el reflector se inyecta directamente
  }

  // Este método es crucial para obtener el request correcto para Passport
  getRequest(context: ExecutionContext) {
    // Intenta obtener el contexto GraphQL primero, ya que es la ruta principal que falla
    const gqlCtx = GqlExecutionContext.create(context);
    const gqlReq = gqlCtx.getContext().req;
    if (gqlReq) {
      this.logger.debug('Petición de Fastify obtenida del contexto GraphQL.');
      return gqlReq;
    }

    // Si no es GraphQL, intenta obtener el contexto HTTP (para REST endpoints normales)
    const httpCtx = context.switchToHttp();
    const httpReq = httpCtx.getRequest();
    if (httpReq) {
      this.logger.debug('Petición de Fastify obtenida del contexto HTTP.');
      return httpReq;
    }

    // Si no se puede obtener la petición de ninguno de los contextos, lanza un error
    this.logger.error('No se pudo obtener la petición del contexto para autenticación.');
    throw new UnauthorizedException('No se pudo obtener la petición del contexto para autenticación.');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('Ruta marcada como pública. Saltando autenticación JWT.');
      return true; // Permitir acceso si la ruta es pública
    }

    // Para todas las demás rutas (protegidas), intenta autenticar con JWT
    try {
      this.logger.debug('Intentando autenticación JWT para ruta protegida...');
      // Llama al método canActivate de la clase padre (AuthGuard)
      const result = await super.canActivate(context) as boolean;
      this.logger.debug(`Resultado de la autenticación JWT: ${result}`);
      return result;
    } catch (e) {
      // Captura cualquier error durante el proceso de autenticación JWT
      this.logger.error(`Acceso no autorizado. Error de autenticación JWT: ${e.message}`, e.stack);
      throw new UnauthorizedException('Acceso no autorizado. Token JWT inválido o ausente.');
    }
  }
}