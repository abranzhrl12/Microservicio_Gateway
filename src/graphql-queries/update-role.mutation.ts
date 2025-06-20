import { gql } from 'graphql-request'

export const updateRoleMutation = gql`
  mutation UpdateRole($id: String!, $updateRoleInput: UpdateRoleInput!) {
    updateRole(id: $id, updateRoleInput: $updateRoleInput) {
      createdAt
      description
      id
      name
      updatedAt
    }
  }
`;