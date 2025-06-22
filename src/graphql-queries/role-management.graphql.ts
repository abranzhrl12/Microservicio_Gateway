// src/graphql-queries/role-management.graphql.ts (En tu proyecto GATEWAY)


export const ASSIGN_PERMISSIONS_TO_ROLE_MUTATION = `
  mutation AssignPermissionsToRole($assignPermissionsToRoleInput: AssignPermissionsToRoleInput!) {
    assignPermissionsToRole(assignPermissionsToRoleInput: $assignPermissionsToRoleInput) {
      id
      name
      isActive
      createdAt
      updatedAt
      permissions {
        id
        name
        description
        createdAt
        updatedAt
      }
    }
  }
`;