// src/graphql-queries/auth-login.query.ts
import { gql } from 'graphql-request';

export const loginQuery = gql`
  mutation LoginUser($loginInput: LoginInput!) {
    loginUser(loginInput: $loginInput) {
      accessToken
      user {
        id
        email
        name
        lastName
        isActive
        avatarUrl
        avatarPublicId
        createdAt
        updatedAt
        role {
          id
          name
          createdAt
          description
          permissions {
            description
            id
            name
          }
        }
      }
    }
  }
`;
