export enum INPUT_TYPES {
  TEXT = "text",
  EMAIL = "email",
  PASSWORD = "password",
  NUMBER = "number",
  TEL = "tel",
  URL = "url",
  DATE = "date",
  TIME = "time",
  DATETIME_LOCAL = "datetime-local",
  FILE = "file",
  SEARCH = "search",
  COLOR = "color",
  TEXTAREA = "textarea",
  SELECT = "select",
  CHECKBOX = "checkbox",
  DATE_RANGE = "date-range",
}

export enum PRODUCTS_TYPES {
  PRODUCT = "product",
  SEMI_FINISHED = "semi_finished",
  CONTAINER = "container",
  FINISHED_GOOD = "finished_good",
  INGREDIENT = "ingredient",
}

export type InputType = `${INPUT_TYPES}`;
