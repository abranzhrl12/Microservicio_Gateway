import { HttpException, Logger } from "@nestjs/common";
import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MenuItemsOrchestrator } from "src/orchestrators/menu-items/menu-items.orchestrator";
import { MenuItem } from "./interfaces/menu-item.interace";
import { CreateMenuItemInput } from "./dto/create-menu-item.input";

@Resolver()
export class MenuItemsResolver {

    private readonly logger = new Logger(MenuItemsResolver.name);

  constructor(private readonly menuItemsOrchestrator: MenuItemsOrchestrator) {}
 private getCorrelationId(context: any): string {
    return (context.req as any).id || `gql-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private getAuthorizationHeader(context: any): string {
    return context.req.headers.authorization;
  }
   @Mutation(() => MenuItem, { name: 'createMenuItem', description: 'Crea un nuevo ítem de menú (requiere permiso de gestión de ítems de menú).' })
  async createMenuItem(
    @Args('createMenuItemInput') createMenuItemInput: CreateMenuItemInput,
    @Context() context : any
  ): Promise<MenuItem> {
    
    const correlationId = this.getCorrelationId(context);
    const authorizationHeader = this.getAuthorizationHeader(context);
    this.logger.log(`[${correlationId}] Recibida mutación GraphQL para crear ítem de menú: ${JSON.stringify(createMenuItemInput)}`);
    const orchestratorResult = await this.menuItemsOrchestrator.createMenuItem(
      correlationId,
      createMenuItemInput || {},
      authorizationHeader
    )
    if(orchestratorResult.errors){
      const errorMessage = orchestratorResult.message || 'Ocurrio un error inesperado al crear el ítem de menú.' ;
      throw new HttpException(errorMessage, orchestratorResult.statusCode || 500);
    }

  
      return orchestratorResult.body as MenuItem;
  }
}