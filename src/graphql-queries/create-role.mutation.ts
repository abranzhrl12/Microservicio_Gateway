// src/graphql-queries/create-role.mutation.ts (EN EL API GATEWAY)

import { gql } from 'graphql-request'; // <-- ¡Añade esta importación!

export const createRoleMutation = gql` 
  mutation CreateRole($createRoleInput: CreateRoleInput!) {
    createRole(createRoleInput: $createRoleInput) {
      id
      name
      description
      createdAt
      updatedAt
    }
  }
`;