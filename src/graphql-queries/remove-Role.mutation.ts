// src/graphql-queries.ts (EN TU API GATEWAY)
import { gql } from 'graphql-request'

export const removeRoleMutation =gql `
  mutation RemoveRole($id: ID!) {
    removeRole(id: $id)
  }
`;