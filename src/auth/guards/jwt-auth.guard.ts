// // src/auth/guards/jwt-auth.guard.ts
// import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { GqlExecutionContext } from '@nestjs/graphql';
// import { Reflector } from '@nestjs/core';
// import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

// @Injectable()
// export class JwtAuthGuard extends AuthGuard('jwt') {
//   private readonly logger = new Logger(JwtAuthGuard.name);

//   constructor(private reflector: Reflector) {
//     super(); // No es necesario pasar nada al constructor de AuthGuard si el reflector se inyecta directamente
//   }

//   // Este método es crucial para obtener el request correcto para Passport
//   getRequest(context: ExecutionContext) {
//     // Intenta obtener el contexto GraphQL primero, ya que es la ruta principal que falla
//     const gqlCtx = GqlExecutionContext.create(context);
//     const gqlReq = gqlCtx.getContext().req;
//     if (gqlReq) {
//       this.logger.debug('Petición de Fastify obtenida del contexto GraphQL.');
//       return gqlReq;
//     }

//     // Si no es GraphQL, intenta obtener el contexto HTTP (para REST endpoints normales)
//     const httpCtx = context.switchToHttp();
//     const httpReq = httpCtx.getRequest();
//     if (httpReq) {
//       this.logger.debug('Petición de Fastify obtenida del contexto HTTP.');
//       return httpReq;
//     }

//     // Si no se puede obtener la petición de ninguno de los contextos, lanza un error
//     this.logger.error('No se pudo obtener la petición del contexto para autenticación.');
//     throw new UnauthorizedException('No se pudo obtener la petición del contexto para autenticación.');
//   }

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
//       context.getHandler(),
//       context.getClass(),
//     ]);

//     if (isPublic) {
//       this.logger.debug('Ruta marcada como pública. Saltando autenticación JWT.');
//       return true; // Permitir acceso si la ruta es pública
//     }

//     // Para todas las demás rutas (protegidas), intenta autenticar con JWT
//     try {
//       this.logger.debug('Intentando autenticación JWT para ruta protegida...');
//       // Llama al método canActivate de la clase padre (AuthGuard)
//       const result = await super.canActivate(context) as boolean;
//       this.logger.debug(`Resultado de la autenticación JWT: ${result}`);
//       return result;
//     } catch (e) {
//       // Captura cualquier error durante el proceso de autenticación JWT
//       this.logger.error(`Acceso no autorizado. Error de autenticación JWT: ${e.message}`, e.stack);
//       throw new UnauthorizedException('Acceso no autorizado. Token JWT inválido o ausente.');
//     }
//   }
// }

// src/auth/guards/jwt-auth.guard.ts (en el GATEWAY)

import { Injectable, ExecutionContext, UnauthorizedException, Logger, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { FastifyRequest, FastifyReply } from 'fastify'; // Asegúrate de que FastifyReply esté importado

// Ya no inyectamos LoginOrchestrator aquí si no maneja el refresco automático
// import { LoginOrchestrator } from 'src/orchestrators/login/login.orchestrator'; 

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    // Elimina LoginOrchestrator del constructor si no lo usas aquí para refresh automático
    // private readonly loginOrchestrator: LoginOrchestrator, 
  ) {
    super();
  }

  getRequest(context: ExecutionContext): FastifyRequest {
    const gqlCtx = GqlExecutionContext.create(context);
    const req = gqlCtx.getContext().req;
    if (req) {
      this.logger.debug('Petición de Fastify obtenida del contexto GraphQL.', JwtAuthGuard.name);
      return req;
    }
    const httpCtx = context.switchToHttp();
    const httpReq = httpCtx.getRequest();
    if (httpReq) {
      this.logger.debug('Petición de Fastify obtenida del contexto HTTP.', JwtAuthGuard.name);
      return httpReq;
    }
    this.logger.error('No se pudo obtener la petición del contexto para autenticación.', JwtAuthGuard.name);
    throw new UnauthorizedException('No se pudo obtener la petición del contexto para autenticación.');
  }

  // getResponse ya no es estrictamente necesario si el guard no setea cookies, pero lo puedes mantener
  getResponse(context: ExecutionContext): FastifyReply {
    const gqlCtx = GqlExecutionContext.create(context);
    const res = gqlCtx.getContext().res;
    if (res) {
      return res;
    }
    const httpCtx = context.switchToHttp();
    const httpRes = httpCtx.getResponse();
    return httpRes;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('Ruta marcada como pública. Saltando autenticación JWT.', JwtAuthGuard.name);
      return true;
    }
    
    // Aquí el Guard solo intenta validar el Access Token de la cookie HttpOnly.
    // Si falla (expirado, inválido), simplemente lanza UnauthorizedException.
    try {
      this.logger.debug('Intentando autenticación JWT para ruta protegida...', JwtAuthGuard.name);
      const result = await super.canActivate(context) as boolean;
      this.logger.debug(`Resultado de la autenticación JWT: ${result}`, JwtAuthGuard.name);
      return result; 
    } catch (e: any) {
      this.logger.error(`Acceso no autorizado. Error de autenticación JWT: ${e.message}`, e.stack, JwtAuthGuard.name);
      // El frontend recibirá este 401 y será responsable de iniciar el flujo de refresco manual
      throw new UnauthorizedException('Acceso no autorizado. Token JWT inválido o ausente/expirado.');
    }
  }
}