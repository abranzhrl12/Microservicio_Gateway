// src/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify'; // Import FastifyRequest
import { IncomingHttpHeaders } from 'http';

// --- IMPORT YOUR AUTHENTICATED USER INTERFACE HERE ---
import { AuthenticatedUser, UserRole } from 'src/common/interfaces/authenticated-user.interface'; // <-- IMPORT HERE!

// The JwtPayload should reflect what's *inside* the token
interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole; // <-- Matches your AuthenticatedUser interface
  permissions: string[];
  iat?: number;
  exp?: number;
}

// Your jwtExtractor code (no changes needed here as it only extracts token)
const jwtExtractor = (request: FastifyRequest): string | null => {
    // ... (your existing jwtExtractor code) ...
    if (request && request.cookies && request.cookies.access_token) {
        const token = request.cookies.access_token;
        if (token) {
            Logger.debug('Token JWT extraído de la cookie.', 'JwtExtractor');
            (request as any).jwtToken = token; // Store for later in validate
            return token;
        }
    }
    // ... (rest of your jwtExtractor for Authorization header) ...
    return null;
};


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: jwtExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  // Ensure the return type matches your AuthenticatedUser interface
  async validate(req: FastifyRequest, payload: JwtPayload): Promise<AuthenticatedUser> {
    const rawToken = (req as any).jwtToken;

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      this.logger.error('Token ha expirado según el campo "exp" del payload.');
      throw new UnauthorizedException('Token expirado.');
    }

    // --- Validate payload properties carefully ---
    if (!payload.sub || !payload.email || !payload.permissions || !Array.isArray(payload.permissions)) {
      this.logger.error(`Payload de JWT incompleto o inválido. Datos recibidos: ${JSON.stringify(payload)}`);
      throw new UnauthorizedException('Payload de JWT incompleto o inválido: Faltan datos esenciales (sub, email, permissions).');
    }

    // Specific validation for the 'role' object
    if (!payload.role || typeof payload.role !== 'object' || !payload.role.id || !payload.role.name) {
        this.logger.error('Payload de JWT incompleto o inválido: El campo "role" es incorrecto o faltante.');
        throw new UnauthorizedException('Payload de JWT incompleto o inválido: El campo "role" es incorrecto o faltante.');
    }

    // --- Construct the AuthenticatedUser object ---
    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role, // Assign the full role object
      permissions: payload.permissions,
      token: rawToken,
    };

    // Assign to req.user (Fastify's request object)
    req.user = user;

    return user;
  }
}