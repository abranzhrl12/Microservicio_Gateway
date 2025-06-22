<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).



//Role
🚀 API Gateway - Documentación
Este documento describe cómo interactuar con nuestra API para la gestión de roles.

URL Base de la API: http://localhost:4000 (¡Asegúrate de que el Gateway esté corriendo en este puerto!)

🔑 Autenticación (¡Importante!)
Casi todas las operaciones requieren que estés autenticado. Debes incluir tu token JWT en el encabezado Authorization de cada solicitud, con el prefijo Bearer.

Ejemplo de encabezado para todas las solicitudes protegidas:

Authorization: Bearer TU_TOKEN_JWT_AQUI
🧑‍💻 Endpoints de Roles
1. Crear un Nuevo Rol
Método: POST
Ruta: /roles/create
Necesitas: Tu token JWT.
Cuerpo de la Solicitud (JSON):

JSON

{
  "variables": {
    "createRoleInput": {
      "name": "NombreDelRol",          // Ej: "Administrador", "Docente", "Estudiante"
      "description": "Descripción del rol." // Opcional, pero recomendado
    }
  }
}
Ejemplo con curl:

Bash

curl -X POST \
  http://localhost:4000/roles/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
        "variables": {
          "createRoleInput": {
            "name": "Supervisor",
            "description": "Rol para supervisar operaciones"
          }
        }
      }'
Respuestas Comunes:

200 OK: Rol creado. Recibirás los datos del rol creado.
400 Bad Request: Datos inválidos o el nombre del rol ya existe.
401 Unauthorized: No hay token o el token es inválido.
403 Forbidden: No tienes permiso para crear roles.
2. Obtener Todos los Roles (Paginado)
Método: GET
Ruta: /roles/all
Necesitas: Tu token JWT.
Opcional: Puedes añadir parámetros de paginación a la URL.
Parámetros de URL (Query Parameters):

page: Número de página que quieres (ej. ?page=2). Por defecto es 1.
limit: Cuántos roles quieres por página (ej. &limit=5). Por defecto es 10.
Ejemplos de Solicitud:

Obtener la primera página (por defecto 10 roles):
GET http://localhost:4000/roles/all
Obtener la página 2 con 5 roles por página:
GET http://localhost:4000/roles/all?page=2&limit=5
Obtener la primera página con 20 roles:
GET http://localhost:4000/roles/all?limit=20
Ejemplo con curl (Obtener la primera página):

Bash

curl -X GET \
  http://localhost:4000/roles/all \
  -H "Authorization: Bearer TU_TOKEN_JWT"
Ejemplo de Respuesta 200 OK (Paginada):

JSON

{
  "items": [
    // Lista de objetos de rol
    {
      "id": "1",
      "name": "user",
      "description": "Usuario estándar",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "totalItems": 15,        // Cantidad total de roles en el sistema
  "totalPages": 2,         // Total de páginas disponibles
  "currentPage": 1,        // La página que estás viendo
  "itemsPerPage": 10       // Roles por página en esta respuesta
}
Respuestas Comunes:

200 OK: Lista de roles paginada.
400 Bad Request: Parámetros de paginación inválidos (ej. page o limit no son números válidos).
401 Unauthorized: No hay token o el token es inválido.
403 Forbidden: No tienes permiso para ver roles.


//traer roles 
{
    "query": "query GetAllRoles($paginationInput: PaginationInput) { findAllRoles(paginationInput: $paginationInput) { items { id name description createdAt updatedAt } totalItems totalPages currentPage itemsPerPage } }",
    "variables": {
        "paginationInput": {
            "page": 1,
            "limit": 5
        }
    },
    "operationName": "GetAllRoles"
}


//update role
{
  "query": "mutation UpdateRole($id: ID!, $updateRoleInput: UpdateRoleInput!) { updateRole(id: $id, updateRoleInput: $updateRoleInput) { id name description createdAt updatedAt } }",
  "variables": {
    "id": "7",
    "updateRoleInput": {
      "name": "actulizando pruebaaaa",
      "description": "Nueva descripción para el rol."
    }
  },
  "operationName": "UpdateRole"
}

//crear role
{
    "query": "mutation CreateRole($createRoleInput: CreateRoleInput!) { createRole(createRoleInput: $createRoleInput) { id name description createdAt updatedAt } }",
    "variables": {
        "createRoleInput": {
            "name": "NuevoRolDePrueba 44gfdfgr",
            "description": "Este es un rol creado desde Postman."
        }
    },
    "operationName": "CreateRole"
}

//remove role
{
    "query": "mutation RemoveRole($id: ID!) { removeRole(id: $id) }",
    "variables": {
        "id": "7"  // Reemplaza "7" con el ID del rol que quieres eliminar
    }
}

//asignar permisos role
{
  "query": "mutation AssignPermissionsToRole($assignPermissionsToRoleInput: AssignPermissionsToRoleInput!) { assignPermissionsToRole(assignPermissionsToRoleInput: $assignPermissionsToRoleInput) { id name  createdAt updatedAt   } }",
  "variables": {
    "assignPermissionsToRoleInput": {
      "roleId": 2,      
      "permissionIds": [        
        "d27165db-9726-4a5f-bb23-e9898c10a4b7"          
      ]
    }
  },
  "operationName": "AssignPermissionsToRole"
}


//crear permisos 
{
  "query": "mutation CreateNewPermission($input: CreatePermissionInput!) { createPermission(createPermissionInput: $input) { id name description } }",
  "variables": {
    "input": {
      "name": "can_assss",
      "description": "Permite al usuario ver el dashboard principal de la aplicación."
    }
  },
  "operationName": "CreateNewPermission"
}
//traer permisos 
{
  "query": "query FindAllPermissions($paginationInput: PaginationInput) { findAllPermissions(paginationInput: $paginationInput) { items { id name description } totalItems totalPages currentPage itemsPerPage } }",
  "variables": {
    "paginationInput": {
      "page": 1,
      "limit": 10
    }
  },
  "operationName": "FindAllPermissions"
}

//actulizar permisos
{
  "query": "mutation UpdatePermission($id: ID!, $updatePermissionInput: UpdatePermissionInput!) { updatePermission(id: $id, updatePermissionInput: $updatePermissionInput) { id name description } }",
  "variables": {
    "id": "8c7c8b56-43ff-4cb5-9e83-917b128cc771",
    "updatePermissionInput": {
      "name": "debe eliminarse",
      "description": "Nueva descripción del permiso actualizado."
    }
  },
  "operationName": "UpdatePermission"
}
//remover permisos

{
  "query": "mutation RemovePermission($id: ID!) { removePermission(id: $id) }",
  "variables": {
    "id": "9715fdb5-841e-4f4e-a4da-e5490546e854"
  }
}

//para buscar por name filtro permission
{
  "query": "query FindPermissionByName($name: String!) { findPermissionByName(name: $name) { id name description } }",
  "variables": {
    "name": "de"
  },
  "operationName": "FindPermissionByName"
}

//crear usuario
{
  "query": "mutation CreateUser($createUserInput: CreateUserInput!) { createUser(createUserInput: $createUserInput) { id email dni name lastName isActive avatarUrl avatarPublicId createdAt updatedAt role { id name description } } }",
  "variables": {
    "createUserInput": {
      "email": "abran@gmail.com",
      "password": "12345678",
      "name": "Abraham",
      "lastName": "Rodriguez",
      "dni": "74752487",
      "roleId": 2, 
      "isActive": true

    }
  },
  "operationName": "CreateUser"
}

//finallusers
{
  "query": "query FindAllUsers($paginationInput: PaginationInput) { findAllUsers(paginationInput: $paginationInput) { items { id email name lastName dni isActive avatarUrl avatarPublicId createdAt updatedAt  role { id name    } } totalItems totalPages currentPage itemsPerPage } }",
  "variables": {
    "paginationInput": {
      "page": 6,
      "limit": 1
    }
  },
  "operationName": "FindAllUsers"
}


//actulizar usuario
{
  "query": "mutation UpdateUser($id: ID!, $updateUserInput: UpdateUserInput!) { updateUser(id: $id, updateUserInput: $updateUserInput) { id email dni name lastName isActive avatarUrl avatarPublicId createdAt updatedAt  role { id name description } } }",
  "variables": {
    "id": "1",
    "updateUserInput": {
      "email": "nuevo.email@ejemplo.com",
      "name": "NuevoNombre",
      "lastName": "NuevoApellido",
      "dni": "12345667",
      "roleId": 2, 
      "isActive": true 

    }
  },
  "operationName": "UpdateUser"
}

//actulizar estado de usuario isactive
{
  "query": "mutation UpdateUserStatus($id: ID!, $updateUserStatusInput: UpdateUserStatusInput!) { updateUserStatus(id: $id, updateUserStatusInput: $updateUserStatusInput) { id email isActive createdAt updatedAt } }",
  "variables": {
    "id": 1, 
    "updateUserStatusInput": {
      "isActive": false 
    }
  },
  "operationName": "UpdateUserStatus"
}
//buscar nombre dni rol o eamil
{
  "query": "query SearchUsers($paginationInput: UsersPaginationInput) { searchUsers(paginationInput: $paginationInput) { items { id email name lastName dni isActive avatarUrl avatarPublicId role { id name } } totalItems totalPages currentPage itemsPerPage } }",
  "variables": {
    "paginationInput": {
      "page": 1,
      "limit": 10,
      "nameFilter": "a",      
      "emailFilter": null,
      "dniFilter": null,
      "roleIdFilter":  null
    }
  },
  "operationName": "SearchUsers"
}

//crear item menu padre
{
  "query": "mutation CreateMenuItem($createMenuItemInput: CreateMenuItemInput!) { createMenuItem(createMenuItemInput: $createMenuItemInput) { ...MenuItemFields } } fragment MenuItemFields on MenuItem { id label path icon isActive order parentId requiredPermissions  children { id label } }",
  "variables": {
    "createMenuItemInput": {
      "label": "Dashboard",
      "path": "/dashboard",
      "icon": "home",
      "isActive": true,
      "order": 1,
      "requiredPermissions": ["view_dashboard"]
    }
  },
  "operationName": "CreateMenuItem"
}
//crear menu item hijo
{
  "query": "mutation CreateMenuItem($createMenuItemInput: CreateMenuItemInput!) { createMenuItem(createMenuItemInput: $createMenuItemInput) { ...MenuItemFields } } fragment MenuItemFields on MenuItem { id label path icon isActive order parentId requiredPermissions  children { id label } }",
  "variables": {
    "createMenuItemInput": {
      "label": "Reportes",
      "path": "/dashboard/reports",
      "icon": "chart",
      "isActive": true,
      "order": 2,
      "requiredPermissions": ["view_users_category"],
      "parentId": "c045bed3-1318-4fb4-8bbe-a24ac110b68a" // <-- ¡AQUÍ ES DONDE ESPECIFICAS EL PADRE!
    }
  },
  "operationName": "CreateMenuItem"
}


//login 
{
  "query": "mutation LoginUser($loginInput: LoginInput!) { loginUser(loginInput: $loginInput) { accessToken user { id email dni name lastName isActive avatarUrl avatarPublicId createdAt updatedAt role { createdAt description id name updatedAt permissions { description id name } } } menuItems { id label path icon   parentId requiredPermissions children { id label path icon parentId } } } }",
  "variables": {
    "loginInput": {
      "email": "test@gmail.com",
      "password": "12345678"
    }
  },
  "operationName": "LoginUser"
}