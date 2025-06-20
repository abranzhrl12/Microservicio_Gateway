import { gql } from 'graphql-request';

export const findAllRolesQuery = gql`
  query FindAllRoles($paginationInput: PaginationInput) { 
    findAllRoles(paginationInput: $paginationInput) {   
      items {
        id
        name
        description
        createdAt
        updatedAt
      }
      totalItems
      totalPages
      currentPage
      itemsPerPage
    }
  }
`;
