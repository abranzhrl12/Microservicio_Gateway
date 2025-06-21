
// src/auth/strategies/jwt.strategy.ts
// src/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common'; // Mantengo Logger para el constructor y errores esenciales
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import { IncomingHttpHeaders } from 'http';

// ¡FUNCIÓN DE EXTRACCIÓN DE JWT PERSONALIZADA Y MÁS ROBUSTA PARA FASTIFY/GRAPHQL!
const jwtExtractor = (request: FastifyRequest): string | null => {
  let headers: IncomingHttpHeaders | undefined;

  if (request && request.headers) {
    headers = request.headers;
  }

  if (!headers || !headers.authorization) {
    return null;
  }

  const authorizationHeader = headers.authorization;
  const authString = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;

  if (!authString) {
    return null;
  }

  const [type, token] = authString.split(' ');
  if (type === 'Bearer' && token) {
    return token;
  } else {
    return null;
  }
};

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name); // Mantengo el logger para errores

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: jwtExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: FastifyRequest, payload: JwtPayload) {
    // Si bien los headers son accesibles aquí, ya fueron procesados por jwtExtractor
    // para obtener el token. No es necesario volver a verificarlos a menos que
    // haya una lógica específica que los requiera.

    if (payload.exp && Date.now() / 1000 > payload.exp) {
        this.logger.error('Token ha expirado según el campo "exp" del payload.');
        throw new UnauthorizedException('Token expirado.');
    }

    if (!payload.sub) {
      this.logger.error('Payload de JWT incompleto: Falta el campo "sub" (subject/user ID).');
      throw new UnauthorizedException('Payload de JWT incompleto o inválido: Falta "sub".');
    }
    if (!payload.email) {
      this.logger.error('Payload de JWT incompleto: Falta el campo "email".');
      throw new UnauthorizedException('Payload de JWT incompleto o inválido: Falta "email".');
    }
    if (!payload.role) {
      this.logger.error('Payload de JWT incompleto: Falta el campo "role".');
      throw new UnauthorizedException('Payload de JWT incompleto o inválido: Falta "role".');
    }

    // Aquí puedes asignar el usuario a la solicitud si lo necesitas en el contexto de GraphQL
    req.user = { id: payload.sub, email: payload.email, role: payload.role };

    return payload;
  }
}