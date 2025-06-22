// src/graphql-queries/permission-management.graphql.ts
import { gql } from 'graphql-request';

// Mutaciones para CRUD de Permisos
export const CREATE_PERMISSION_MUTATION = gql`
  mutation CreatePermission($createPermissionInput: CreatePermissionInput!) {
    createPermission(createPermissionInput: $createPermissionInput) {
      id
      name
      description
    }
  }
`;

export const UPDATE_PERMISSION_MUTATION = gql`
  mutation UpdatePermission(
    $id: ID!
    $updatePermissionInput: UpdatePermissionInput!
  ) {
    updatePermission(id: $id, updatePermissionInput: $updatePermissionInput) {
      id
      name
      description
    }
  }
`;

export const REMOVE_PERMISSION_MUTATION = gql`
  mutation RemovePermission($id: ID!) {
    removePermission(id: $id) 
  }
`;
// ¡NUEVA QUERY PARA BUSCAR PERMISO POR NOMBRE!
export const FIND_PERMISSION_BY_NAME_QUERY = gql`
  query FindPermissionByName($name: String!) {
    findPermissionByName(name: $name) {
      id
      name
      description
    }
  }
`;
// Queries para buscar Permisos
export const FIND_ALL_PERMISSIONS_QUERY = gql`
  query FindAllPermissions($paginationInput: PaginationInput) { 
    findAllPermissions(paginationInput: $paginationInput) { 
      currentPage
      itemsPerPage
      totalItems
      totalPages
      items {
        description
        id
        name
      }
    }
  }
`;

export const FIND_PERMISSION_BY_ID_QUERY = gql`
  query FindPermissionById($id: ID!) {
    findPermissionById(id: $id) {
      id
      name
      description
    }
  }
`;

