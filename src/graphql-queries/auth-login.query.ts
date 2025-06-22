// src/graphql-queries/auth-login.query.ts
import { gql } from 'graphql-request';

export const loginQuery = gql`
  mutation LoginUser($loginInput: LoginInput!) {
    loginUser(loginInput: $loginInput) {
      accessToken
      refreshToken
      user {
        id
        email
        name
        dni
        lastName
        isActive
        avatarUrl
        avatarPublicId
        role {
          id
          name
          permissions {
            id
            name
          }
        }
      }
    }
      
  }
`;
