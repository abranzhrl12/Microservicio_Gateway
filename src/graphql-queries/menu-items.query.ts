import { gql } from 'graphql-request';
// Fragmento GraphQL para MenuItem (puedes ponerlo en un archivo separado si lo deseas)
export const MENU_ITEM_FIELDS = gql`
  fragment MenuItemFields on MenuItem {
    id
    label
    path
    icon
    isActive
    order
    parentId
    requiredPermissions
    createdAt
    updatedAt
    children {
      id
      label
      path
      icon
      isActive
      order
      parentId
      requiredPermissions

    }
  }
`;

// Definir las mutaciones y queries GraphQL para el microservicio
export const CREATE_MENU_ITEM_MUTATION = gql`
  mutation CreateMenuItem($createMenuItemInput: CreateMenuItemInput!) {
    createMenuItem(createMenuItemInput: $createMenuItemInput) {
      ...MenuItemFields
    }
  }
  ${MENU_ITEM_FIELDS}
`;

export const FIND_ALL_MENU_ITEMS_QUERY = gql`
  query FindAllMenuItems {
    findAllMenuItems {
      ...MenuItemFields
    }
  }
  ${MENU_ITEM_FIELDS}
`;

export const FIND_ACTIVE_MENU_ITEMS_FOR_ADMIN_QUERY = gql`
  query FindActiveMenuItemsForAdmin {
    findActiveMenuItemsForAdmin {
      ...MenuItemFields
    }
  }
  ${MENU_ITEM_FIELDS}
`;

export const UPDATE_MENU_ITEM_MUTATION = gql`
  mutation UpdateMenuItem($updateMenuItemInput: UpdateMenuItemInput!) {
    updateMenuItem(updateMenuItemInput: $updateMenuItemInput) {
      ...MenuItemFields
    }
  }
  ${MENU_ITEM_FIELDS}
`;

export const REMOVE_MENU_ITEM_MUTATION = gql`
  mutation RemoveMenuItem($id: ID!) {
    removeMenuItem(id: $id) {
      id
      label
    }
  }
`;