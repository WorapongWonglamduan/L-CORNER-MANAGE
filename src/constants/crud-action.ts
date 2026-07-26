export const CRUD_ACTION = {
  CREATE: "create",
  EDIT: "edit",
  UPDATE: "update",
  DELETE: "delete",
} as const;

export type CrudAction = (typeof CRUD_ACTION)[keyof typeof CRUD_ACTION];

export type FormMode = typeof CRUD_ACTION.CREATE | typeof CRUD_ACTION.EDIT;
