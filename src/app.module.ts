import { Module, Logger, HttpException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AppController } from './app.controller';
import { JoiValidationSchema } from './config/joi.validation';  // Importa el esquema de validación Joi
import { EnvConfiguration } from './config/env.config';  // Importa la configuración de entorno
import { WebSocketModule } from './websocket/websocket.module';
import { NatsClientModule } from './nats-client/nats-client.module';
import { RolesModule } from './roles/roles.module';
import { ExecutionResult, GraphQLError } from 'graphql';
import { GraphQLISODateTime, GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { join } from 'path';
import { PermissionsModule } from './permission/permissions.module';
import { UsersModule } from './users/users.module';
import { MenuItemsModule } from './menu-items/menu-items.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [EnvConfiguration],        
      isGlobal: true,                  
      envFilePath: '.env',          
      validationSchema: JoiValidationSchema, 
    }),
    NatsClientModule,
    AuthModule,  
    WebSocketModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    MenuItemsModule,
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
       autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      graphiql: false,
      context: ({ req }) => ({ req }),
      jit: 10,
      resolvers: { DateTime: GraphQLISODateTime },
      
      errorFormatter: (execution: ExecutionResult & { errors: GraphQLError[] }, context: any) => {
        
        const error = execution.errors[0];
        const originalError = error?.extensions?.originalError;


        if (originalError instanceof HttpException) {
          const httpStatus = originalError.getStatus();
          const response = originalError.getResponse();
          return {
            statusCode: httpStatus,
            response: execution, // Pasamos el objeto de ejecución como response
            message: typeof response === 'string' ? response : (response as any).message,
            locations: error.locations,
            path: error.path,
            extensions: {
              code: originalError.name, // Ej. 'UnauthorizedException'
              custom: {
                ...(typeof response === 'object' && response !== null ? response : {}),
              },
            },
          };
        }

        return {
          statusCode: 500, // Valor por defecto para errores generales
          response: execution,
          message: error.message,
          locations: error.locations,
          path: error.path,
          extensions: {
            code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
          },
        };
      }, 
    }),
  
  ],
  controllers: [AppController],
  providers: [
    Logger,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,  // Protege las rutas con JWT
    },
  ],
})
export class AppModule {}
