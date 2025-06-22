// src/auth/auth.resolver.ts (en el GATEWAY)
import { Resolver, Mutation, Args } from '@nestjs/graphql'; // NestJS GraphQL decorator
import { Public } from 'src/common/decorators/public.decorator';
import { LoginOrchestrator } from 'src/orchestrators/login/login.orchestrator';
import { Logger, HttpStatus, HttpException, BadRequestException, UnauthorizedException } from '@nestjs/common'; // Importa excepciones HTTP
import { v4 as uuidv4 } from 'uuid';
import { AuthResponse } from './models/auth-response.model';
import { LoginInputDto } from './dto/login-input.dto';
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface';

@Resolver()
export class AuthResolver {
  private readonly logger = new Logger(AuthResolver.name);

  constructor(private readonly loginOrchestrator: LoginOrchestrator) {}
 @Mutation(() => AuthResponse, { name: 'loginUser' })
  @Public()
  async login(@Args('loginInput') loginInput: LoginInputDto): Promise<AuthResponse> {
    const correlationId = uuidv4();
    this.logger.log(`[${correlationId}] [AuthResolver Gateway] Recibida mutación loginUser.`);
    this.logger.debug(`[${correlationId}] LoginInput: ${JSON.stringify(loginInput)}`);

    try {
      const orchestratorResult: OrchestratorResult<AuthResponse> = await this.loginOrchestrator.orchestrateLogin(
        loginInput,
        correlationId,
      );

      // Ahora, `orchestratorResult.errors` DEBERÍA ser reconocido
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
        return orchestratorResult.body;
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