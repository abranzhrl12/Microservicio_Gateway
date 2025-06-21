import { gql } from 'graphql-request'

export const findRoleByIdQuery  = gql`query FindRoleById($id: ID!) {
    findRoleById(id: $id) {
      id
      name
      description
      createdAt
      updatedAt
    }
  } `