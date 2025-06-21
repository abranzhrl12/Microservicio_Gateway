// src/graphql-queries/update-role.mutation.ts (EN TU API GATEWAY)

import { gql } from 'graphql-request'

export const updateRoleMutation = gql`
  mutation UpdateRole($id: ID!, $updateRoleInput: UpdateRoleInput!) { 
    updateRole(id: $id, updateRoleInput: $updateRoleInput) {
      createdAt
      description
      id
      name
      updatedAt
    }
  }
`;