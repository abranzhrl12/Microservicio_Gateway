// src/graphql-queries/user-management.graphql.ts
import { gql } from 'graphql-request';

// Fragmento para reutilizar los campos comunes de User en las respuestas
// (Este fragmento debería coincidir con los campos que tu Gateway User Type expone)
export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    email
    dni
    name
    lastName
    isActive
    avatarUrl
    avatarPublicId
    createdAt
    updatedAt
    roleId
    role {
      id
      name
      description
    }
  }
`;

// Mutaciones para CRUD de Usuarios
export const CREATE_USER_MUTATION = gql`
  mutation CreateUser($createUserInput: CreateUserInput!) {
    createUser(createUserInput: $createUserInput) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser(
    $id: ID!
    $updateUserInput: UpdateUserInput!
  ) {
    updateUser(id: $id, updateUserInput: $updateUserInput) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const UPDATE_USER_STATUS_MUTATION = gql`
  mutation UpdateUserStatus(
    $id: ID!
    $updateUserStatusInput: UpdateUserStatusInput!
  ) {
    updateUserStatus(id: $id, updateUserStatusInput: $updateUserStatusInput) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const REMOVE_USER_MUTATION = gql`
  mutation RemoveUser($id: ID!) {
    removeUser(id: $id)
  }
`;

// Queries para buscar Usuarios
export const FIND_ALL_USERS_QUERY = gql`
  query FindAllUsers($paginationInput: PaginationInput) {
    findAllUsers(paginationInput: $paginationInput) { 
      items {
        ...UserFields
      }
      totalItems
      totalPages
      currentPage
      itemsPerPage
    }
  }
  ${USER_FIELDS}
`;

export const FIND_USER_BY_ID_QUERY = gql`
  query FindUserById($id: ID!) {
    findUserById(id: $id) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const SEARCH_USERS_QUERY = gql`
  query SearchUsers($paginationInput: UsersPaginationInput) {
    searchUsers(paginationInput: $paginationInput) {
      totalItems
      totalPages
      currentPage
      itemsPerPage
      items {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;
