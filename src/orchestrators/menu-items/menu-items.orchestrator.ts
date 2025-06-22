import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom ,timeout} from 'rxjs';
import { OrchestratorResult } from 'src/common/interfaces/orchestrator-result.interface';
import { deepTransformDates } from 'src/common/utils/date.utils';
import { CREATE_MENU_ITEM_MUTATION } from 'src/graphql-queries/menu-items.query';
import { CreateMenuItemInput } from 'src/menu-items/dto/create-menu-item.input';
import { MenuItem } from 'src/menu-items/interfaces/menu-item.interace';

@Injectable()
export class MenuItemsOrchestrator {
  private readonly logger = new Logger(MenuItemsOrchestrator.name);
  constructor(@Inject('NATS_SERVICE') private authServiceClient: ClientProxy) {}

    private async sendGraphqlRequest<T = any>(
    correlationId: string,
    query: string,
    variables: any,
    authorizationHeader?: string,
    operationName: string = 'GraphQL Operation',
  ): Promise<OrchestratorResult<T>> {
    this.logger.log(
      `[${correlationId}] [Permission Orchestrator] Enviando solicitud a Auth Service para ${operationName} vía NATS.`,
    );

    const headersToSend: { [key: string]: string } = {
      'X-Correlation-ID': correlationId,
    };

    if (authorizationHeader) {
      headersToSend['Authorization'] = authorizationHeader;
    }

    try {
      const response = await firstValueFrom(
        this.authServiceClient.send(
          { cmd: 'sidebar_graphql_request' },
          {
            query: query,
            variables: variables,
            headers: headersToSend,
          },
        ).pipe(
          timeout(10000), 
        ),
      );
      if (response && response.errors && response.errors.length > 0) {
        this.logger.error(
          `[${correlationId}] [Menu Items Orchestrator] Error al enviar la solicitud a Auth Service para ${operationName}: ${JSON.stringify(response.errors)}`,
        );
        return {
          statusCode: response.statusCode || HttpStatus.BAD_REQUEST,
          errors: response.errors,
          message:
            response.errors[0]?.message ||
            `Error al enviar la solicitud a Auth Service ${operationName}.`,
          body: undefined,
        };
      }
      this.logger.log(
        `[${correlationId}] [Menu Items Orchestrator] Respuesta de Auth Service para ${operationName}.`,
      );

      const transformedData = deepTransformDates(response.data);
      this.logger.debug(
        `[${correlationId}] Datos de respuesta del Auth Service transformados con deepTransformDates.`,
      );

      return {
        statusCode: HttpStatus.OK,
        body: transformedData, // Devolver los datos transformados
        errors: undefined,
        message: `${operationName} exitosamente.`,
      };

    } catch (error) {
     this.logger.error(
        `[${correlationId}] [Menu Items Orchestrator] Error en la comunicación con Auth Service o error inesperado durante ${operationName}: ${error.message}`,
        error.stack,
      );
      return{
        statusCode:
          error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        errors: error.errors || [
          { message: error.message || 'Error desconocido en el orquestador.' },
        ],
        message:
          `Error interno del Gateway al comunicarse con el servicio de autenticación para ${operationName}.`,
        body: undefined,
      }
    }
  }

    
     async createMenuItem(
    correlationId: string,
    createMenuItemInput: CreateMenuItemInput,
    authorizationHeader?: string,
  ): Promise<OrchestratorResult> {
    this.logger.log(`[${correlationId}] [Menu Items Orchestrator] Iniciando orquestación para crear ítem de menú.`);
    const result= await this.sendGraphqlRequest(
      correlationId,
      CREATE_MENU_ITEM_MUTATION,
      { createMenuItemInput: createMenuItemInput },
      authorizationHeader,
      'crear ítem de menú',
    )
    if(result.errors){
        return result
    }
   result.body = result.body.createMenuItem
    return result
  }
  
}
