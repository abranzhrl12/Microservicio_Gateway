// // src/auth/guards/jwt-auth.guard.ts
// import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { GqlExecutionContext } from '@nestjs/graphql'; // Para manejar contextos GraphQL (si el Gateway expone GraphQL)
// import { Reflector } from '@nestjs/core';
// import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

// @Injectable()
// export class JwtAuthGuard extends AuthGuard('jwt') { // 'jwt' es el nombre de la estrategia definida en JwtStrategy
//   constructor(private reflector: Reflector) {
//     super();
//   }

//   // Este método es crucial para que el Guard funcione tanto con HTTP (REST) como con GraphQL
//   getRequest(context: ExecutionContext) {
//     // Intenta obtener el contexto HTTP (para REST)
//     const httpCtx = context.switchToHttp();
//     if (httpCtx.getRequest()) {
//       return httpCtx.getRequest();
//     }

//     // Si no es HTTP, intenta obtener el contexto GraphQL
//     const gqlCtx = GqlExecutionContext.create(context);
//     if (gqlCtx.getContext().req) {
//         return gqlCtx.getContext().req;
//     }

//     // Si no se puede obtener la petición, lanza un error
//     throw new UnauthorizedException('No se pudo obtener la petición del contexto.');
//   }

//   // Este método se ejecuta antes de intentar validar el token.
//   // Permite que ciertas rutas sean "públicas" (sin autenticación).
//   canActivate(context: ExecutionContext) {
//     // Verifica si la ruta actual está marcada con el decorador @Public()
//     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
//       context.getHandler(), // En el método del controlador
//       context.getClass(),   // En la clase del controlador
//     ]);

//     if (isPublic) {
//       return true; // Si es pública, permite el acceso sin validación JWT
//     }

//     // Si no es pública, el guard de Passport intentará autenticar (llama a validate() de JwtStrategy)
//     return super.canActivate(context);
//   }
// }
// src/auth/guards/jwt-auth.guard.ts
// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common'; // <-- ¡Añade Logger aquí!
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Añade una instancia de Logger
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    
    // Verifica si es una solicitud de 'Upgrade' (típico de WebSockets)
    // Fastify lo maneja internamente, pero el request original aún tiene los headers.
    if (req && req.headers && req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
      // Para este escenario, simplemente retornamos la petición.
      // `canActivate` debería usar `isPublic` para pasarla si no hay necesidad de JWT en el handshake.
      return req;
    }

    // Intenta obtener el contexto HTTP (para REST)
    const httpCtx = context.switchToHttp();
    if (httpCtx.getRequest()) {
      return httpCtx.getRequest();
    }

    // Si no es HTTP, intenta obtener el contexto GraphQL
    const gqlCtx = GqlExecutionContext.create(context);
    if (gqlCtx.getContext().req) {
        return gqlCtx.getContext().req;
    }

    throw new UnauthorizedException('No se pudo obtener la petición del contexto.');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // AGREGAR EXCLUSIÓN PARA SOLICITUDES DE UPGRADE SI NO SON PÚBLICAS Y NO SE DEBEN AUTENTICAR AQUÍ
    const req = this.getRequest(context);

    // Si la petición es una solicitud de 'Upgrade' (WebSocket)
    // y no está marcada como pública (que no lo estará para el /ws),
    // la permitimos pasar para que el handshake de WS se complete.
    // La autenticación real para WS (si es necesaria) se haría *después* del handshake.
    if (req && req.headers && req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        this.logger.warn('Intentando autenticar una conexión WebSocket no marcada como pública. Permitiendo temporalmente para el handshake.');
        return true; // <-- Permitir que el handshake de WebSocket continúe.
    }

    // Para solicitudes HTTP/GraphQL normales, sigue con la autenticación JWT
    try {
        const result = await super.canActivate(context) as boolean;
        return result;
    } catch (e) {
        this.logger.error(`Acceso no autorizado. Error de autenticación JWT: ${e.message}`, e.stack);
        throw new UnauthorizedException('Acceso no autorizado. Token JWT inválido o ausente.');
    }
  }
}