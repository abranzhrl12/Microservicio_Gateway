// src/graphql-queries/sidebar-menu.query.ts
import { gql } from 'graphql-request'; // Si estás usando gql de graphql-request

export const sidebarQuery = gql`
  query GetSidebarMenu { 
    getSidebarMenu {     
      id
      label
      path
      icon
      children {
        id
        label
        path
        icon
        children {
          id
          label
          path
          icon
        }
      }
    }
  }
`;